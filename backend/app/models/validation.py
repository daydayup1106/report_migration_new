"""Pydantic models for AI-powered validation results."""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class ValidationSeverity(str, Enum):
    """Severity levels for validation findings."""
    ERROR = "error"       # Must fix — blocks completeness
    WARNING = "warning"   # Should fix — impacts quality
    INFO = "info"         # Optional improvement suggestion


class ValidationCategory(str, Enum):
    """Categories for grouping validation findings."""
    STRUCTURE = "structure"
    DUPLICATES = "duplicates"
    DATA_TYPES = "data_types"
    DESCRIPTIONS = "descriptions"
    NAMING = "naming"
    COMPLETENESS = "completeness"
    SEMANTIC = "semantic"


class ValidationFinding(BaseModel):
    """A single validation finding with severity and actionable message."""

    severity: ValidationSeverity
    category: ValidationCategory
    field: Optional[str] = None
    message: str
    suggestion: Optional[str] = None


class ValidationResult(BaseModel):
    """Complete validation result combining deterministic and AI checks."""

    score: int = Field(ge=0, le=100, description="Overall quality score 0-100")
    findings: List[ValidationFinding] = []
    summary: str = ""
    isComplete: bool = False

    errorCount: int = 0
    warningCount: int = 0
    infoCount: int = 0

    aiValidated: bool = False
