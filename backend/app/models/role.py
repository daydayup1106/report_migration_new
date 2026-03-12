"""Pydantic models for roles."""

from pydantic import BaseModel, Field
from typing import Dict, Optional
from datetime import datetime


class RoleAvailability(BaseModel):
    """Role availability configuration."""
    
    user: str = "Yes"
    SystemAdminOnly: str = "No"
    tester: str = "Yes"
    
    class Config:
        json_schema_extra = {
            "example": {
                "user": "Yes",
                "SystemAdminOnly": "No",
                "tester": "Yes"
            }
        }


class Role(BaseModel):
    """Role configuration for a report in specific environment."""
    
    reportId: str
    reportName: str
    environment: str  # dev, sit, uat, prod
    reportRoleId: int
    reportAvailable: RoleAvailability
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "reportId": "200012",
                "reportName": "Client Metrics",
                "environment": "dev",
                "reportRoleId": 391,
                "reportAvailable": {
                    "user": "Yes",
                    "SystemAdminOnly": "No",
                    "tester": "Yes"
                }
            }
        }


class RoleCreate(BaseModel):
    """Schema for creating a role."""
    
    reportId: str
    reportName: str
    environment: str
    reportRoleId: int
    reportAvailable: RoleAvailability


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    
    reportRoleId: Optional[int] = None
    reportAvailable: Optional[RoleAvailability] = None


class RoleResponse(Role):
    """Response model for role."""
    
    id: Optional[str] = Field(alias="_id", default=None)
    
    class Config:
        populate_by_name = True
