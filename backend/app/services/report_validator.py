"""AI-powered report validation service.

Two-phase pipeline:
  Phase 1 — Deterministic checks (always runs, zero latency)
  Phase 2 — AI semantic analysis  (single LLM call, graceful fallback)
"""

import logging
import re
from typing import List, Optional
from collections import Counter

from pydantic import BaseModel, Field

from app.models.report import Report
from app.models.validation import (
    ValidationResult,
    ValidationFinding,
    ValidationSeverity,
    ValidationCategory,
)
from app.config import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# Format validation patterns
# ──────────────────────────────────────────────────────────────
_MONGODB_OBJECTID_PATTERN = re.compile(r'^[0-9a-fA-F]{24}$')
# ReportId: alphanumeric, underscore, hyphen only (no spaces, no special chars)
_REPORTID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')

# ──────────────────────────────────────────────────────────────
# Known data-type prefixes that are considered valid.
# Uses prefix matching so "varchar(64)", "decimal.Decimal", etc. pass.
# ──────────────────────────────────────────────────────────────
_KNOWN_TYPE_PREFIXES = (
    "str", "string", "text",
    "int", "integer", "bigint", "smallint",
    "float", "double", "numeric",
    "decimal",
    "bool", "boolean",
    "date", "datetime", "timestamp",
    "varchar", "char",
    "uuid", "json", "jsonb",
)


def _is_known_type(raw_type: str) -> bool:
    """Check if a data type string matches any known prefix."""
    normalized = raw_type.strip().lower().replace(" ", "")
    return any(normalized.startswith(prefix) for prefix in _KNOWN_TYPE_PREFIXES)


# ──────────────────────────────────────────────────────────────
# Structured output schemas for the AI validation call
# ──────────────────────────────────────────────────────────────

class AIFinding(BaseModel):
    """Single AI-detected validation finding."""
    severity: str = Field(description="One of: error, warning, info")
    category: str = Field(description="One of: descriptions, naming, semantic, completeness")
    field: Optional[str] = Field(default=None, description="Field path, e.g. 'columns[2].columnName'")
    message: str = Field(description="Actionable message for the user")
    suggestion: Optional[str] = Field(default=None, description="How to fix the issue")


class AIValidationOutput(BaseModel):
    """Structured output schema for the AI validation agent."""
    findings: List[AIFinding] = Field(description="List of validation findings")
    summary: str = Field(description="One-sentence overall quality summary")
    quality_score_adjustment: int = Field(
        ge=-30, le=10,
        description="Score adjustment from -30 to +10 based on semantic quality",
    )


# ──────────────────────────────────────────────────────────────
# System prompt
# ──────────────────────────────────────────────────────────────

VALIDATION_SYSTEM_PROMPT = """\
You are a report metadata quality analyst for a business intelligence platform.

You will receive a parsed report's metadata (name, description, columns, parameters) \
and must evaluate its SEMANTIC quality — meaning, naming conventions, description \
helpfulness, and business logic coherence.

IMPORTANT: Structural checks (missing fields, duplicates, data types) have ALREADY \
been performed by deterministic code. Do NOT repeat those checks. Focus ONLY on:

1. DESCRIPTION QUALITY
   - Flag circular descriptions that merely restate the column name.
     BAD:  "Bill ID - the bill ID"
     GOOD: "Unique identifier for each billing transaction"
   - Flag vague or generic descriptions that add no value.

2. NAMING CONVENTIONS
   - Flag mixing of camelCase and snake_case within the same report.
   - Flag unclear abbreviations (e.g. "col1", "tmp_val").
   - Flag overly long names (>50 characters).

3. SEMANTIC COHERENCE
   - Are data types reasonable for the column names?
     (e.g. a "date" column typed as "str" is suspicious)
   - Do parameter names align with their stated purpose?
   - Is the report type consistent with its columns?

4. COMPLETENESS SUGGESTIONS
   - Missing report type when it could be inferred from column names.
   - Parameters that could benefit from default values.

For each finding provide:
  severity  — "error" ONLY for genuinely misleading descriptions or clearly wrong types.
               "warning" for quality issues. "info" for nice-to-have improvements.
  category  — one of: descriptions, naming, semantic, completeness
  field     — specific path, e.g. "columns[3].columnDescription", "reportType"
  message   — specific, actionable message
  suggestion — how to fix it

Also provide:
  summary                  — one sentence describing overall quality
  quality_score_adjustment — score modifier from -30 (terrible) to +10 (exceptional)

Be concise. Only flag genuine issues. Do not flag things that are acceptable."""


# ──────────────────────────────────────────────────────────────
# Validator class
# ──────────────────────────────────────────────────────────────

class ReportValidator:
    """Validates reports using deterministic checks + AI semantic analysis."""

    def __init__(self):
        """Initialize with optional LLM for AI validation."""
        self.llm = None
        self.ai_available = False

        try:
            from langchain_anthropic import ChatAnthropic

            self.llm = ChatAnthropic(
                model="claude-sonnet-4-20250514",
                anthropic_api_key=settings.anthropic_api_key,
                temperature=0.1,
                max_tokens=2000,
            )
            self.ai_available = True
            logger.info("ReportValidator initialized with AI support")
        except Exception as e:
            logger.warning(f"AI validation unavailable: {e}. Deterministic-only mode.")

    # ─── Public API ───────────────────────────────────────────

    async def validate(self, report: Report) -> ValidationResult:
        """Run full validation pipeline: deterministic + AI."""

        # Phase 1 — deterministic
        findings = self._run_deterministic_checks(report)
        base_score = self._calculate_base_score(report, findings)

        # Phase 2 — AI semantic (if available)
        ai_validated = False
        ai_adjustment = 0
        summary = self._generate_fallback_summary(base_score, findings)

        if self.ai_available and self.llm:
            try:
                ai_result = await self._run_ai_validation(report)
                if ai_result:
                    for af in ai_result.findings:
                        try:
                            findings.append(ValidationFinding(
                                severity=ValidationSeverity(af.severity),
                                category=ValidationCategory(af.category),
                                field=af.field,
                                message=af.message,
                                suggestion=af.suggestion,
                            ))
                        except ValueError:
                            logger.warning(
                                f"Skipping AI finding with invalid enum: "
                                f"severity={af.severity}, category={af.category}"
                            )
                    ai_adjustment = ai_result.quality_score_adjustment
                    summary = ai_result.summary
                    ai_validated = True
            except Exception as e:
                logger.error(f"AI validation failed: {e}. Using deterministic results only.")

        final_score = max(0, min(100, base_score + ai_adjustment))

        error_count = sum(1 for f in findings if f.severity == ValidationSeverity.ERROR)
        warning_count = sum(1 for f in findings if f.severity == ValidationSeverity.WARNING)
        info_count = sum(1 for f in findings if f.severity == ValidationSeverity.INFO)

        return ValidationResult(
            score=final_score,
            findings=findings,
            summary=summary,
            isComplete=final_score >= 80 and error_count == 0,
            errorCount=error_count,
            warningCount=warning_count,
            infoCount=info_count,
            aiValidated=ai_validated,
        )

    # ─── Phase 1: Deterministic Checks ────────────────────────

    def _run_deterministic_checks(self, report: Report) -> List[ValidationFinding]:
        findings: List[ValidationFinding] = []
        findings.extend(self._check_required_fields(report))
        findings.extend(self._check_column_structure(report))
        findings.extend(self._check_parameter_structure(report))
        findings.extend(self._check_duplicates(report))
        findings.extend(self._check_data_types(report))
        return findings

    def _check_required_fields(self, report: Report) -> List[ValidationFinding]:
        findings = []

        # Check for missing reportId
        if not report.reportId or not report.reportId.strip():
            findings.append(ValidationFinding(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.STRUCTURE,
                field="reportId",
                message="reportId is blank — please provide a unique identifier for this report.",
                suggestion="Use the report number from your source system, e.g. '200012'. Click 'Fix' to add it.",
            ))
        # Check reportId format (alphanumeric, underscore, hyphen only)
        elif not _REPORTID_PATTERN.match(report.reportId):
            findings.append(ValidationFinding(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.STRUCTURE,
                field="reportId",
                message=f"reportId '{report.reportId}' contains invalid characters — only letters, numbers, underscore (_), and hyphen (-) are allowed.",
                suggestion="Use a valid format like '200012', 'RPT_2024_001', or 'credit-detail-report'. Click 'Fix' to update it.",
            ))

        if not report.reportName or not report.reportName.strip():
            findings.append(ValidationFinding(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.STRUCTURE,
                field="reportName",
                message="reportName is missing — every report must have a human-readable name.",
                suggestion="Provide a descriptive name like 'Client Transaction Summary'.",
            ))

        if not report.reportDescription or len(report.reportDescription.strip()) < 10:
            findings.append(ValidationFinding(
                severity=ValidationSeverity.WARNING,
                category=ValidationCategory.COMPLETENESS,
                field="reportDescription",
                message="Report description is missing or too short (under 10 characters).",
                suggestion="Add a 1-2 sentence description explaining what this report provides.",
            ))

        if not report.reportType:
            findings.append(ValidationFinding(
                severity=ValidationSeverity.INFO,
                category=ValidationCategory.COMPLETENESS,
                field="reportType",
                message="No report type specified. Consider categorizing this report.",
                suggestion="Common types: 'Client Metrics', 'Transaction', 'Settlement', 'Portfolio'.",
            ))

        if not report.columns:
            findings.append(ValidationFinding(
                severity=ValidationSeverity.ERROR,
                category=ValidationCategory.STRUCTURE,
                field="columns",
                message="Report has no columns defined — at least one column is required.",
                suggestion="Check that the Excel file has a 'Columns' section with column definitions.",
            ))

        # Check formatSpecId format (must be 24-char hex MongoDB ObjectId)
        if report.reportFormatSpecId:
            if not _MONGODB_OBJECTID_PATTERN.match(report.reportFormatSpecId):
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.STRUCTURE,
                    field="reportFormatSpecId",
                    message=f"formatSpecId '{report.reportFormatSpecId}' is invalid — must be a 24-character hexadecimal string (MongoDB ObjectId format).",
                    suggestion="Use a valid ObjectId like '507f1f77bcf86cd799439011' or leave blank if not applicable. Click 'Fix' to update it.",
                ))

        # Check domainId format (must be 24-char hex MongoDB ObjectId)
        if report.reportDomainId:
            if not _MONGODB_OBJECTID_PATTERN.match(report.reportDomainId):
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.STRUCTURE,
                    field="reportDomainId",
                    message=f"domainId '{report.reportDomainId}' is invalid — must be a 24-character hexadecimal string (MongoDB ObjectId format).",
                    suggestion="Use a valid ObjectId like '507f1f77bcf86cd799439011' or leave blank if not applicable. Click 'Fix' to update it.",
                ))

        if not report.parameters:
            findings.append(ValidationFinding(
                severity=ValidationSeverity.INFO,
                category=ValidationCategory.COMPLETENESS,
                field="parameters",
                message="No parameters defined. Reports with filter parameters are more flexible.",
                suggestion="Consider adding date range or entity filter parameters.",
            ))

        return findings

    def _check_column_structure(self, report: Report) -> List[ValidationFinding]:
        findings = []
        for i, col in enumerate(report.columns):
            if not col.columnName or not col.columnName.strip():
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.STRUCTURE,
                    field=f"columns[{i}].columnName",
                    message=f"Column at index {i} has no display name.",
                    suggestion="Every column must have a columnName for display in the UI.",
                ))
            if not col.originalColumnName or not col.originalColumnName.strip():
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.STRUCTURE,
                    field=f"columns[{i}].originalColumnName",
                    message=f"Column '{col.columnName}' has no database column name.",
                    suggestion="Provide the database column name (e.g. 'bill_id').",
                ))
            if not col.columnDescription or len(col.columnDescription.strip()) < 5:
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.WARNING,
                    category=ValidationCategory.DESCRIPTIONS,
                    field=f"columns[{i}].columnDescription",
                    message=f"Column '{col.columnName}' has no description or a very short one.",
                    suggestion="Add a meaningful description explaining what this column represents.",
                ))
        return findings

    def _check_parameter_structure(self, report: Report) -> List[ValidationFinding]:
        findings = []
        for i, param in enumerate(report.parameters):
            if not param.parameterName or not param.parameterName.strip():
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.STRUCTURE,
                    field=f"parameters[{i}].parameterName",
                    message=f"Parameter at index {i} has no name.",
                    suggestion="Every parameter must have a parameterName.",
                ))
            if not param.originalColumnName or not param.originalColumnName.strip():
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.WARNING,
                    category=ValidationCategory.STRUCTURE,
                    field=f"parameters[{i}].originalColumnName",
                    message=f"Parameter '{param.parameterName}' has no linked database column.",
                    suggestion="Specify which database column this parameter filters on.",
                ))
        return findings

    def _check_duplicates(self, report: Report) -> List[ValidationFinding]:
        findings = []

        # Duplicate display names
        col_names = [c.columnName.lower().strip() for c in report.columns if c.columnName]
        for name, count in Counter(col_names).items():
            if count > 1:
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.DUPLICATES,
                    field="columns",
                    message=f"Duplicate column display name: '{name}' appears {count} times.",
                    suggestion="Each column must have a unique display name.",
                ))

        # Duplicate original column names
        orig_names = [c.originalColumnName.lower().strip() for c in report.columns if c.originalColumnName]
        for name, count in Counter(orig_names).items():
            if count > 1:
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.DUPLICATES,
                    field="columns",
                    message=f"Duplicate database column name: '{name}' appears {count} times. This may cause query conflicts.",
                    suggestion="Each column must have a unique database column name. Verify these columns are correct.",
                ))

        # Duplicate parameter names
        param_names = [p.parameterName.lower().strip() for p in report.parameters if p.parameterName]
        for name, count in Counter(param_names).items():
            if count > 1:
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.ERROR,
                    category=ValidationCategory.DUPLICATES,
                    field="parameters",
                    message=f"Duplicate parameter name: '{name}'.",
                    suggestion="Each parameter must have a unique name.",
                ))

        return findings

    def _check_data_types(self, report: Report) -> List[ValidationFinding]:
        findings = []
        for i, col in enumerate(report.columns):
            dt = col.dataType.strip() if col.dataType else ""
            if not dt:
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.WARNING,
                    category=ValidationCategory.DATA_TYPES,
                    field=f"columns[{i}].dataType",
                    message=f"Column '{col.columnName}' has no data type specified.",
                    suggestion="Specify a type such as str, int, float, decimal, datetime, bool.",
                ))
            elif not _is_known_type(dt):
                findings.append(ValidationFinding(
                    severity=ValidationSeverity.INFO,
                    category=ValidationCategory.DATA_TYPES,
                    field=f"columns[{i}].dataType",
                    message=f"Column '{col.columnName}' has non-standard type '{col.dataType}'.",
                    suggestion="Consider using a standard type: str, int, float, decimal, datetime, bool.",
                ))
        return findings

    # ─── Scoring ──────────────────────────────────────────────

    def _calculate_base_score(self, report: Report, findings: List[ValidationFinding]) -> int:
        score = 0

        if report.reportName:
            score += 15
        if report.reportDescription and len(report.reportDescription.strip()) >= 10:
            score += 15
        if report.reportType:
            score += 10
        if report.columns:
            score += 20
            cols_with_desc = sum(
                1 for c in report.columns
                if c.columnDescription and len(c.columnDescription.strip()) >= 5
            )
            if len(report.columns) > 0:
                coverage = cols_with_desc / len(report.columns)
                score += int(coverage * 20)
        if report.parameters:
            score += 10
        if report.reportId and report.reportId.strip():
            score += 10

        # Penalty for errors
        error_count = sum(1 for f in findings if f.severity == ValidationSeverity.ERROR)
        score -= error_count * 5

        return max(0, min(100, score))

    def _generate_fallback_summary(self, score: int, findings: List[ValidationFinding]) -> str:
        error_count = sum(1 for f in findings if f.severity == ValidationSeverity.ERROR)
        warning_count = sum(1 for f in findings if f.severity == ValidationSeverity.WARNING)

        if error_count == 0 and warning_count == 0:
            return "Report metadata looks complete and well-structured."
        elif error_count > 0:
            return f"Found {error_count} error(s) that should be resolved for a complete report."
        else:
            return f"Report is usable but has {warning_count} warning(s) to consider addressing."

    # ─── Phase 2: AI Semantic Validation ──────────────────────

    async def _run_ai_validation(self, report: Report) -> Optional[AIValidationOutput]:
        """Run AI-powered semantic validation using structured output."""
        report_snapshot = self._build_report_snapshot(report)

        structured_llm = self.llm.with_structured_output(AIValidationOutput)

        messages = [
            ("system", VALIDATION_SYSTEM_PROMPT),
            ("human", f"Validate the following report metadata:\n\n{report_snapshot}"),
        ]

        result = await structured_llm.ainvoke(messages)
        return result

    def _build_report_snapshot(self, report: Report) -> str:
        lines = [
            f"Report ID: {report.reportId or '(not set)'}",
            f"Report Name: {report.reportName or '(not set)'}",
            f"Report Type: {report.reportType or '(not set)'}",
            f"Report Description: {report.reportDescription or '(not set)'}",
            "",
            f"=== COLUMNS ({len(report.columns)} total) ===",
        ]

        for i, col in enumerate(report.columns):
            lines.append(
                f'  [{i}] displayName="{col.columnName}" '
                f'dbColumn="{col.originalColumnName}" '
                f"type={col.dataType} "
                f'desc="{col.columnDescription or "(none)"}"'
            )

        lines.append(f"\n=== PARAMETERS ({len(report.parameters)} total) ===")
        for i, param in enumerate(report.parameters):
            lines.append(
                f'  [{i}] name="{param.parameterName}" '
                f'dbColumn="{param.originalColumnName}" '
                f"type={param.parameterType} "
                f'value="{param.parameterValue or "(none)"}"'
            )

        return "\n".join(lines)
