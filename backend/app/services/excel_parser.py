"""Excel file parser for report metadata extraction."""

import openpyxl
import uuid
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import logging

from app.models.report import Report, Column, Parameter, Tab, TabContent
from app.models.role import Role, RoleAvailability
from app.models.report_config import ReportConfig
from app.models.report_ui_settings import ReportUiSettings, UiColumn

logger = logging.getLogger(__name__)

# ─── Header normalization ────────────────────────────────────
# Maps any variation of header text to a canonical key.
# Covers: "columnName", "column name", "column_name", "Column Name", etc.

# Base aliases — used when header meaning is unambiguous.
# "column name" is intentionally OMITTED here because it's ambiguous:
#   - In some files it means display name (columnName)
#   - In others it means DB name (originalColumnName)
# Resolved dynamically in _build_column_field_map() based on context.
_COLUMN_HEADER_ALIASES: Dict[str, str] = {
    'columnname':         'columnName',
    'column_name':        'columnName',
    'displayname':        'columnName',
    'display_name':       'columnName',
    'display name':       'columnName',
    'actualname':         'columnName',
    'actual_name':        'columnName',
    'actual name':        'columnName',
    'originalcolumnname': 'originalColumnName',
    'original_column_name': 'originalColumnName',
    'original column name': 'originalColumnName',
    'column name':        'originalColumnName',  # default: treat as DB name
    'datatype':           'dataType',
    'data_type':          'dataType',
    'data type':          'dataType',
    'type':               'dataType',
    'type (postgresql)':  'dataType',
    'description':        'description',
    'columndescription':  'description',
    'column_description': 'description',
    'column description': 'description',
}

# When "actual name" or similar display-name header is present,
# "column name" clearly means the DB/original column. Otherwise
# we need to detect which meaning applies.
_DISPLAY_NAME_INDICATORS = {'actual name', 'actual_name', 'actualname',
                            'display name', 'display_name', 'displayname'}
_DB_NAME_INDICATORS = {'originalcolumnname', 'original_column_name',
                       'original column name'}

_PARAM_HEADER_ALIASES: Dict[str, str] = {
    'parametername':      'parameterName',
    'parameter_name':     'parameterName',
    'parameter name':     'parameterName',
    'paramname':          'parameterName',
    'originalcolumnname': 'originalColumnName',
    'original_column_name': 'originalColumnName',
    'original column name': 'originalColumnName',
    'parametertype':      'parameterType',
    'parameter_type':     'parameterType',
    'parameter type':     'parameterType',
    'type':               'parameterType',
}


def _normalize(text: str) -> str:
    """Lowercase and strip whitespace for comparison."""
    return text.strip().lower()


def _build_field_map(
    header_row: tuple,
    aliases: Dict[str, str],
) -> Dict[str, int]:
    """
    Given a header row and an alias dict, return {canonical_field: column_index}.
    This lets us parse columns regardless of their order or naming convention.
    """
    field_map: Dict[str, int] = {}
    for idx, cell in enumerate(header_row):
        if cell is None:
            continue
        key = _normalize(str(cell))
        canonical = aliases.get(key)
        if canonical and canonical not in field_map:
            field_map[canonical] = idx
    return field_map


def _build_column_field_map(header_row: tuple) -> Dict[str, int]:
    """
    Context-aware field mapping for column headers.

    Handles the ambiguity of "column name":
      - If "actual name" is present → "column name" = originalColumnName
      - If "originalColumnName" is present → "column name" = columnName (display)
      - If neither → "column name" = columnName (default camelCase convention)
    """
    keys = {_normalize(str(c)) for c in header_row if c is not None}

    has_display_indicator = bool(keys & _DISPLAY_NAME_INDICATORS)
    has_db_indicator = bool(keys & _DB_NAME_INDICATORS)

    # Build a context-specific alias map
    aliases = dict(_COLUMN_HEADER_ALIASES)

    if has_display_indicator:
        # "actual name" handles display → "column name" means DB/original
        aliases['column name'] = 'originalColumnName'
    elif has_db_indicator:
        # "originalColumnName" handles DB → "column name" means display
        aliases['column name'] = 'columnName'
    else:
        # Standalone "column name" with no other context → treat as display
        aliases['column name'] = 'columnName'

    return _build_field_map(header_row, aliases)


def _is_section_marker(value) -> Optional[str]:
    """Return the section name if the cell is a section marker, else None."""
    if value is None:
        return None
    text = str(value).strip()
    if text in ('Columns', 'Parameters', 'Roles'):
        return text
    return None


def _is_header_row(row: tuple, aliases: Dict[str, str]) -> bool:
    """Check if any cell in the row matches a known header alias."""
    for cell in row:
        if cell is not None and _normalize(str(cell)) in aliases:
            return True
    return False


def _is_column_header_row(row: tuple) -> bool:
    """
    Stricter check: require at least 2 recognized column header fields.
    Avoids false positives on metadata rows that might contain a single
    matching word like 'type' or 'description'.
    """
    matches = sum(
        1 for cell in row
        if cell is not None and _normalize(str(cell)) in _COLUMN_HEADER_ALIASES
    )
    return matches >= 2


class ExcelParser:
    """Parse Excel files containing report metadata."""

    # Known metadata keys and their accepted variations
    _META_ALIASES: Dict[str, str] = {
        'reportid':       'reportId',
        'report_id':      'reportId',
        'reportname':     'reportName',
        'report_name':    'reportName',
        'formatspecid':   'formatSpecId',
        'format_spec_id': 'formatSpecId',
        'domainid':       'domainId',
        'domain_id':      'domainId',
        'reportbuilder':  'reportBuilder',
        'report_builder': 'reportBuilder',
        'buildertype':    'reportBuilder',
        'builder_type':   'reportBuilder',
        'reportdescription':  'reportDescription',
        'report_description': 'reportDescription',
        'reporttype':     'reportType',
        'report_type':    'reportType',
    }

    def __init__(self, file_path: str):
        """Initialize parser with file path."""
        self.file_path = Path(file_path)
        self.wb = openpyxl.load_workbook(str(file_path))
        self.ws = self.wb.active

    # ─── Public API ──────────────────────────────────────────

    def parse(self) -> Tuple[Report, List[Role], ReportConfig, ReportUiSettings]:
        """
        Parse Excel file and return all migration artifacts.

        Returns:
            Tuple of (Report, List[Role], ReportConfig, ReportUiSettings)
        """
        logger.info(f"Parsing Excel file: {self.file_path}")

        metadata = self._extract_metadata()
        columns = self._extract_columns()
        parameters = self._extract_parameters()

        report_id = str(metadata.get('reportId', '')).strip()
        report_name = metadata.get('reportName', '')
        report_type = metadata.get('reportType')

        # Keep reportId blank if not provided - validation will catch it
        # and force user to provide one before saving
        if not report_id:
            logger.warning("No reportId found in Excel. User must provide one before saving.")
            report_id = ""  # Keep it blank instead of generating temp ID

        report = Report(
            reportId=report_id,
            reportName=report_name,
            reportDescription=metadata.get('reportDescription'),
            reportType=report_type,
            reportFormatSpecId=metadata.get('formatSpecId'),
            reportDomainId=metadata.get('domainId'),
            reportBuilder=metadata.get('reportBuilder'),
            columns=columns,
            parameters=parameters,
            createdBy="system",
            updatedBy="system",
        )

        roles = self._generate_default_roles(report_id, report_name)
        config = self._generate_report_config(report_id, report_name, report_type)
        ui_settings = self._generate_ui_settings(
            report_id, report_name, report_type, columns, parameters
        )

        logger.info(
            f"Parsed report {report_id}: "
            f"{len(columns)} columns, {len(parameters)} parameters"
        )

        return report, roles, config, ui_settings

    def close(self):
        """Close the workbook."""
        if self.wb:
            self.wb.close()

    # ─── Metadata Extraction ─────────────────────────────────

    def _extract_metadata(self) -> Dict[str, str]:
        """Extract report-level metadata from key-value pairs in first rows."""
        metadata: Dict[str, str] = {}

        for row in self.ws.iter_rows(min_row=1, max_row=20, values_only=True):
            if not row or not row[0]:
                continue

            key_raw = str(row[0]).strip()

            # Stop if we hit a section marker
            if key_raw in ('Columns', 'Parameters', 'Roles'):
                break

            canonical = self._META_ALIASES.get(_normalize(key_raw))
            if not canonical:
                continue

            value = row[1] if len(row) > 1 else None
            if value is not None:
                metadata[canonical] = str(value).strip()

        logger.debug(f"Extracted metadata: {list(metadata.keys())}")
        return metadata

    # ─── Column Extraction ───────────────────────────────────

    def _extract_columns(self) -> List[Column]:
        """
        Extract column definitions from the Columns section.

        Dynamically detects header row and maps fields by name,
        so column order in the spreadsheet does not matter.

        Handles two layouts:
          1. Explicit "Columns" section marker, then header row, then data.
          2. No marker — header row appears directly after metadata/parameters.
        """
        columns: List[Column] = []
        in_section = False
        field_map: Dict[str, int] = {}

        for row in self.ws.iter_rows(values_only=True):
            if not row:
                continue

            first = str(row[0]).strip() if row[0] is not None else ''

            # ── Look for explicit section marker ──
            if not in_section:
                if first == 'Columns':
                    in_section = True
                    continue
                # Fallback: no marker, but this row IS the header row
                if _is_column_header_row(row):
                    in_section = True
                    field_map = _build_column_field_map(row)
                    logger.debug(f"Column header map (no marker): {field_map}")
                    continue
                # Skip non-column rows (metadata, parameters, etc.)
                continue

            # ── Detect header row (when marker was found) ──
            if not field_map:
                if _is_header_row(row, _COLUMN_HEADER_ALIASES):
                    field_map = _build_column_field_map(row)
                    logger.debug(f"Column header map: {field_map}")
                continue

            # ── End of section ──
            if not first or _is_section_marker(row[0]):
                break

            # ── Parse data row using field map ──
            def get(field: str, default: str = '') -> str:
                idx = field_map.get(field)
                if idx is not None and idx < len(row) and row[idx] is not None:
                    return str(row[idx]).strip()
                return default

            col_name = get('columnName')
            orig_name = get('originalColumnName')

            if not col_name and not orig_name:
                continue

            # If only one is present, derive the other
            if not orig_name:
                orig_name = col_name
            if not col_name:
                col_name = orig_name

            columns.append(Column(
                columnName=col_name,
                originalColumnName=orig_name,
                columnDescription=get('description'),
                dataType=get('dataType', 'str'),
            ))

        logger.debug(f"Extracted {len(columns)} columns")
        return columns

    # ─── Parameter Extraction ────────────────────────────────

    def _extract_parameters(self) -> List[Parameter]:
        """
        Extract parameter definitions from the Parameters section.

        Dynamically detects header row and maps fields by name.
        """
        parameters: List[Parameter] = []
        in_section = False
        field_map: Dict[str, int] = {}

        for row in self.ws.iter_rows(values_only=True):
            if not row:
                continue

            first = str(row[0]).strip() if row[0] is not None else ''

            # ── Look for section marker ──
            if not in_section:
                if first == 'Parameters':
                    in_section = True
                continue

            # ── Detect header row ──
            if not field_map:
                if _is_header_row(row, _PARAM_HEADER_ALIASES):
                    field_map = _build_field_map(row, _PARAM_HEADER_ALIASES)
                    logger.debug(f"Parameter header map: {field_map}")
                continue

            # ── End of section ──
            if not first or _is_section_marker(row[0]):
                break

            # ── Parse data row using field map ──
            def get(field: str, default: str = '') -> str:
                idx = field_map.get(field)
                if idx is not None and idx < len(row) and row[idx] is not None:
                    return str(row[idx]).strip()
                return default

            param_name = get('parameterName')
            orig_name = get('originalColumnName')

            if not param_name or not orig_name:
                continue

            parameters.append(Parameter(
                parameterName=param_name,
                originalColumnName=orig_name,
                parameterType=get('parameterType', 'str'),
                parameterValue=f"${{{param_name}}}",
            ))

        logger.debug(f"Extracted {len(parameters)} parameters")
        return parameters

    # ─── Role Generation ─────────────────────────────────────

    def _generate_default_roles(
        self,
        report_id: str,
        report_name: str,
    ) -> List[Role]:
        """Generate default role configurations for all environments."""
        availability = RoleAvailability(
            user="Yes",
            SystemAdminOnly="No",
            tester="Yes",
        )

        return [
            Role(
                reportId=report_id,
                reportName=report_name,
                environment=env,
                reportRoleId=391,
                reportAvailable=availability,
            )
            for env in ('dev', 'sit', 'uat', 'prod')
        ]

    # ─── Report Config Generation ─────────────────────────────

    def _generate_report_config(
        self,
        report_id: str,
        report_name: str,
        report_type: Optional[str],
    ) -> ReportConfig:
        """Generate default report configuration from parsed metadata."""
        return ReportConfig(
            reportId=report_id,
            reportName=report_name,
            canBeEdited="Yes",
            canBeDeleted="Yes",
            categories=report_type or "",
            isAvailable="Yes",
        )

    # ─── UI Settings Generation ───────────────────────────────

    def _generate_ui_settings(
        self,
        report_id: str,
        report_name: str,
        report_type: Optional[str],
        columns: List[Column],
        parameters: List[Parameter],
    ) -> ReportUiSettings:
        """
        Generate report UI settings from parsed columns and parameters.

        Tab content is derived from parameters:
        - Each parameter becomes a tabContent entry (user-facing input field)
        - reportName and reportType are always included as static content
        - 3 tabs are created: edit, view, download (all share the same content)
        """
        # Build tab content from parameters + standard fields
        tab_content_items = [
            TabContent(contentName="reportName", contentDescription="Report Name"),
            TabContent(contentName="reportType", contentDescription="Report Type"),
        ]
        for param in parameters:
            tab_content_items.append(
                TabContent(
                    contentName=param.parameterName,
                    contentDescription=param.parameterName.replace('_', ' ').title(),
                )
            )

        tabs = [
            Tab(
                tabName=tab_type,
                tabDescription=f"{tab_type.capitalize()} the report",
                tabType=tab_type,
                tabContent=list(tab_content_items),
            )
            for tab_type in ('edit', 'view', 'download')
        ]

        # Build UI columns (dataType → columnType)
        ui_columns = [
            UiColumn(
                columnName=col.columnName,
                originalColumnName=col.originalColumnName,
                columnDescription=col.columnDescription,
                columnType=col.dataType,
            )
            for col in columns
        ]

        return ReportUiSettings(
            reportId=report_id,
            reportName=report_name,
            reportType=report_type,
            tabs=tabs,
            parameters=parameters,
            columns=ui_columns,
        )
