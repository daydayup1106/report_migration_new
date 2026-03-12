"""Pydantic models for report configuration."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReportConfig(BaseModel):
    """Report configuration controlling editability, visibility, and categorization."""

    reportId: str
    reportName: str
    canBeEdited: str = "Yes"
    canBeDeleted: str = "Yes"
    categories: str = ""
    isAvailable: str = "Yes"

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
        json_schema_extra = {
            "example": {
                "reportId": "200012",
                "reportName": "Client Metrics Queries",
                "canBeEdited": "Yes",
                "canBeDeleted": "Yes",
                "categories": "Client Metrics",
                "isAvailable": "Yes",
            }
        }


class ReportConfigResponse(ReportConfig):
    """Response model for report config."""

    id: Optional[str] = Field(alias="_id", default=None)

    class Config:
        populate_by_name = True
