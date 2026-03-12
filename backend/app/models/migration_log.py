"""Pydantic models for migration audit logs."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class MigrationLog(BaseModel):
    """
    Audit trail for every report migration operation.

    Captures the full lifecycle: file received → parsed → enhanced → validated → saved.
    """

    reportId: str
    reportName: str = ""
    filename: str = ""
    status: str = "pending"  # pending | processing | success | failed

    # Counts
    columnsCount: int = 0
    parametersCount: int = 0
    rolesCount: int = 0

    # Validation result from AI
    validation: Optional[Dict[str, Any]] = None

    # Error details (populated on failure)
    errorMessage: Optional[str] = None

    # Processing metadata
    fileSizeMb: float = 0.0
    processingTimeMs: Optional[float] = None
    aiEnhanced: bool = False

    migratedBy: str = "system"
    migratedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
        json_schema_extra = {
            "example": {
                "reportId": "200012",
                "reportName": "Client Metrics Queries",
                "filename": "report migrations_200012.xlsx",
                "status": "success",
                "columnsCount": 21,
                "parametersCount": 2,
                "rolesCount": 4,
                "validation": {"score": 95, "issues": []},
                "fileSizeMb": 0.02,
                "processingTimeMs": 1234.5,
                "aiEnhanced": True,
                "migratedBy": "system",
            }
        }


class MigrationLogResponse(MigrationLog):
    """Response model for migration log."""

    id: Optional[str] = Field(alias="_id", default=None)

    class Config:
        populate_by_name = True
