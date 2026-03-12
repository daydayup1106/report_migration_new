"""Temporary storage model for reports being edited before final save.

This collection stores parsed reports with validation errors/warnings
while users fix issues via Quick Fix. Once all errors are resolved,
the data is migrated to production collections.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.models.report import Column, Parameter, Tab
from app.models.role import Role
from app.models.report_config import ReportConfig
from app.models.report_ui_settings import ReportUiSettings


class ReportUpdateTemplate(BaseModel):
    """Temporary report storage during the fix-and-confirm flow."""

    sessionId: str = Field(..., description="Unique session ID for this upload")

    # Report data
    reportId: str
    reportName: str
    reportDescription: Optional[str] = None
    reportType: Optional[str] = None
    reportFormatSpecId: Optional[str] = None
    reportDomainId: Optional[str] = None
    reportBuilder: Optional[str] = None
    columns: List[Column] = []
    parameters: List[Parameter] = []
    tabs: Optional[List[Tab]] = None

    # Related data
    roles: List[Role] = []
    reportConfig: Optional[ReportConfig] = None
    reportUiSettings: Optional[ReportUiSettings] = None

    # Metadata
    filename: str
    fileSizeMb: float
    processingTimeMs: float
    aiEnhanced: bool = False

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: datetime = Field(
        default_factory=lambda: datetime.utcnow().replace(hour=23, minute=59, second=59),
        description="Temp records expire at end of day"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
