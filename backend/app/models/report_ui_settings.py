"""Pydantic models for report UI settings."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.models.report import Tab, TabContent, Column, Parameter


class UiColumn(BaseModel):
    """Column definition for UI settings (includes columnType instead of dataType)."""

    columnName: str
    originalColumnName: str
    columnDescription: str = ""
    columnType: str = "str"


class ReportUiSettings(BaseModel):
    """
    Per-report UI configuration.

    Defines how the report appears in the frontend:
    - tabs: edit / view / download, each with tabContent entries derived from parameters
    - parameters: filter/input parameters for the report
    - columns: display columns with columnType (mirrors dataType from report)
    """

    reportId: str
    reportName: str
    reportType: Optional[str] = None

    tabs: List[Tab] = []
    parameters: List[Parameter] = []
    columns: List[UiColumn] = []

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
        json_schema_extra = {
            "example": {
                "reportId": "200012",
                "reportName": "Client Metrics Queries",
                "reportType": "Client Metrics",
                "tabs": [
                    {
                        "tabName": "edit",
                        "tabDescription": "Edit the report",
                        "tabType": "edit",
                        "tabContent": [
                            {"contentName": "reportName", "contentDescription": "Report Name"}
                        ],
                    }
                ],
                "parameters": [],
                "columns": [
                    {
                        "columnName": "Bill ID",
                        "originalColumnName": "bill_id",
                        "columnDescription": "unique identifier",
                        "columnType": "str",
                    }
                ],
            }
        }


class ReportUiSettingsResponse(ReportUiSettings):
    """Response model for report UI settings."""

    id: Optional[str] = Field(alias="_id", default=None)

    class Config:
        populate_by_name = True
