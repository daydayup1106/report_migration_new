"""Service for fixing individual report fields via the Quick Fix flow.

Validates proposed values deterministically, applies the fix, and
re-runs full validation to return an updated ValidationResult.
"""

import re
import logging
from typing import Optional, Tuple

from app.models.report import Report, FixFieldResponse
from app.services.mongodb_service import MongoDBService
from app.services.report_validator import (
    ReportValidator,
    _is_known_type,
    _REPORTID_PATTERN,
    _MONGODB_OBJECTID_PATTERN,
)

logger = logging.getLogger(__name__)

# Regex for indexed field paths like "columns[3].columnName"
_INDEXED_FIELD_RE = re.compile(r"^(columns|parameters)\[(\d+)\]\.(\w+)$")

# Top-level fields that can be fixed with a simple string value
_FIXABLE_TOP_FIELDS = {
    "reportId", "reportName", "reportDescription", "reportType",
    "reportFormatSpecId", "reportDomainId", "reportBuilder",
}

# Sub-fields of columns/parameters that can be fixed
_FIXABLE_COLUMN_FIELDS = {"columnName", "columnDescription", "originalColumnName", "dataType"}
_FIXABLE_PARAM_FIELDS = {"parameterName", "originalColumnName", "parameterType", "parameterValue"}


class FieldFixService:
    """Validates and applies single-field fixes to reports."""

    def __init__(self, db_service: MongoDBService, validator: ReportValidator):
        self.db = db_service
        self.validator = validator

    async def fix_pending(
        self,
        report: Report,
        roles: list,
        config,
        ui_settings,
        field: str,
        value: str,
        session_id: str
    ) -> FixFieldResponse:
        """Fix a field on a pending report (not yet saved to DB).

        This modifies the in-memory report object and updates the pending_uploads dict.
        """
        # Parse and validate the field path
        parse_result = self._parse_field_path(field)
        if parse_result is None:
            return FixFieldResponse(
                valid=False,
                field=field,
                newValue=value,
                message=(
                    f"Field '{field}' is not a fixable field. "
                    f"Fixable fields: {', '.join(sorted(_FIXABLE_TOP_FIELDS))}, "
                    f"columns[i].columnName, parameters[i].parameterName, etc."
                ),
            )

        # Get current value
        current_value = self._get_current_value(report, field)

        # Validate the proposed value
        is_valid, msg = await self._validate_value(field, value, report)
        if not is_valid:
            return FixFieldResponse(
                valid=False,
                field=field,
                currentValue=current_value,
                newValue=value,
                message=msg,
            )

        # Apply the fix to in-memory report
        self._set_field_value(report, field, value)

        # Update pending_uploads dict with modified report
        from app.routes.upload import pending_uploads
        file_info = pending_uploads[session_id][4]
        pending_uploads[session_id] = (report, roles, config, ui_settings, file_info)

        # Re-validate
        validation_result = await self.validator.validate(report)

        logger.info(f"Fixed field '{field}' on pending report '{report.reportId}': '{current_value}' -> '{value}'")

        return FixFieldResponse(
            valid=True,
            field=field,
            currentValue=current_value,
            newValue=value,
            message=f"Successfully updated {field}.",
            validation=validation_result.model_dump(),
        )

    async def fix(self, report_id: str, field: str, value: str) -> FixFieldResponse:
        """Validate a proposed value and apply the fix if valid.

        Returns FixFieldResponse with valid=False and a message if the value
        is rejected, or valid=True with the updated ValidationResult on success.
        """
        # Look up the report
        report = await self.db.get_report(report_id)
        if not report:
            return FixFieldResponse(
                valid=False,
                field=field,
                newValue=value,
                message=f"Report '{report_id}' not found.",
            )

        # Parse and validate the field path
        parse_result = self._parse_field_path(field)
        if parse_result is None:
            return FixFieldResponse(
                valid=False,
                field=field,
                newValue=value,
                message=(
                    f"Field '{field}' is not a fixable field. "
                    f"Fixable fields: {', '.join(sorted(_FIXABLE_TOP_FIELDS))}, "
                    f"columns[i].columnName, parameters[i].parameterName, etc."
                ),
            )

        # Get current value
        current_value = self._get_current_value(report, field)

        # Validate the proposed value
        is_valid, msg = await self._validate_value(field, value, report)
        if not is_valid:
            return FixFieldResponse(
                valid=False,
                field=field,
                currentValue=current_value,
                newValue=value,
                message=msg,
            )

        # Apply the fix
        if field == "reportId":
            # Cascade update across all 5 collections
            try:
                await self.db.cascade_update_report_id(report_id, value)
            except Exception as e:
                if "duplicate" in str(e).lower() or "E11000" in str(e):
                    return FixFieldResponse(
                        valid=False,
                        field=field,
                        currentValue=current_value,
                        newValue=value,
                        message=f"reportId '{value}' is already in use by another report.",
                    )
                raise
            # Re-fetch the report with the new ID for re-validation
            report = await self.db.get_report(value)
        else:
            # Set the field value on the report object and save
            self._set_field_value(report, field, value)
            await self.db.save_report(report)

        # Re-validate the updated report
        validation_result = await self.validator.validate(report)

        logger.info(f"Fixed field '{field}' on report '{report_id}': '{current_value}' -> '{value}'")

        return FixFieldResponse(
            valid=True,
            field=field,
            currentValue=current_value,
            newValue=value,
            message=f"Successfully updated {field}.",
            validation=validation_result.model_dump(),
        )

    def _parse_field_path(self, field: str) -> Optional[Tuple[str, Optional[int], Optional[str]]]:
        """Parse a field path into (collection, index, sub_field).

        Returns:
            ("reportId", None, None) for top-level fields
            ("columns", 3, "columnName") for indexed paths
            None if the field is not fixable
        """
        if field in _FIXABLE_TOP_FIELDS:
            return (field, None, None)

        match = _INDEXED_FIELD_RE.match(field)
        if match:
            collection = match.group(1)
            index = int(match.group(2))
            sub_field = match.group(3)

            if collection == "columns" and sub_field in _FIXABLE_COLUMN_FIELDS:
                return (collection, index, sub_field)
            if collection == "parameters" and sub_field in _FIXABLE_PARAM_FIELDS:
                return (collection, index, sub_field)

        return None

    async def _validate_value(
        self, field: str, value: str, report: Report
    ) -> Tuple[bool, str]:
        """Validate a proposed value for a specific field.

        Returns (is_valid, message).
        """
        stripped = value.strip()

        # reportId: non-empty, valid format, check uniqueness
        if field == "reportId":
            if not stripped:
                return False, "reportId cannot be empty."
            if not _REPORTID_PATTERN.match(stripped):
                return False, "reportId can only contain letters, numbers, underscore (_), and hyphen (-)."
            existing = await self.db.get_report(stripped)
            if existing and existing.reportId != report.reportId:
                return False, f"reportId '{stripped}' is already in use by another report."
            return True, ""

        # reportName: non-empty, min 3 chars
        if field == "reportName":
            if not stripped:
                return False, "reportName cannot be empty."
            if len(stripped) < 3:
                return False, "reportName must be at least 3 characters."
            return True, ""

        # reportDescription: always allow (soft check is done by re-validation)
        if field == "reportDescription":
            return True, ""

        # reportType: non-empty
        if field == "reportType":
            if not stripped:
                return False, "reportType cannot be empty."
            return True, ""

        # reportFormatSpecId: must be 24-char hex or blank
        if field == "reportFormatSpecId":
            if stripped and not _MONGODB_OBJECTID_PATTERN.match(stripped):
                return False, "formatSpecId must be a 24-character hexadecimal string (MongoDB ObjectId) or blank."
            return True, ""

        # reportDomainId: must be 24-char hex or blank
        if field == "reportDomainId":
            if stripped and not _MONGODB_OBJECTID_PATTERN.match(stripped):
                return False, "domainId must be a 24-character hexadecimal string (MongoDB ObjectId) or blank."
            return True, ""

        # Other top-level fields: basic non-empty
        if field in _FIXABLE_TOP_FIELDS:
            return True, ""

        # Indexed fields
        match = _INDEXED_FIELD_RE.match(field)
        if match:
            collection = match.group(1)
            index = int(match.group(2))
            sub_field = match.group(3)

            # Bounds check
            items = report.columns if collection == "columns" else report.parameters
            if index < 0 or index >= len(items):
                return False, f"Index {index} is out of range (0-{len(items) - 1})."

            # columnName / parameterName: non-empty
            if sub_field in ("columnName", "parameterName"):
                if not stripped:
                    return False, f"{sub_field} cannot be empty."
                return True, ""

            # dataType: check against known types
            if sub_field == "dataType":
                if not stripped:
                    return False, "dataType cannot be empty."
                if not _is_known_type(stripped):
                    return (
                        False,
                        f"'{stripped}' is not a recognized data type. "
                        f"Use: str, int, float, decimal, datetime, bool, varchar, etc.",
                    )
                return True, ""

            # Everything else: allow
            return True, ""

        return True, ""

    def _get_current_value(self, report: Report, field: str) -> Optional[str]:
        """Get the current value of a field on a report."""
        if field in _FIXABLE_TOP_FIELDS:
            val = getattr(report, field, None)
            return str(val) if val is not None else None

        match = _INDEXED_FIELD_RE.match(field)
        if match:
            collection = match.group(1)
            index = int(match.group(2))
            sub_field = match.group(3)

            items = report.columns if collection == "columns" else report.parameters
            if 0 <= index < len(items):
                val = getattr(items[index], sub_field, None)
                return str(val) if val is not None else None

        return None

    def _set_field_value(self, report: Report, field: str, value: str) -> None:
        """Set a field value on a report object in-place."""
        if field in _FIXABLE_TOP_FIELDS:
            setattr(report, field, value)
            return

        match = _INDEXED_FIELD_RE.match(field)
        if match:
            collection = match.group(1)
            index = int(match.group(2))
            sub_field = match.group(3)

            items = report.columns if collection == "columns" else report.parameters
            if 0 <= index < len(items):
                setattr(items[index], sub_field, value)
