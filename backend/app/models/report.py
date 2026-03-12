"""Pydantic models for reports."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId


class PyObjectId(str):
    """Custom type for MongoDB ObjectId."""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(str(v)):
            raise ValueError("Invalid ObjectId")
        return str(v)


class Column(BaseModel):
    """Report column definition."""
    
    columnName: str
    columnDescription: str = ""
    originalColumnName: str
    dataType: str = "str"
    
    class Config:
        json_schema_extra = {
            "example": {
                "columnName": "Bill ID",
                "columnDescription": "Unique identifier of the bill/transaction record",
                "originalColumnName": "bill_id",
                "dataType": "str"
            }
        }


class Parameter(BaseModel):
    """Report parameter definition."""
    
    parameterName: str
    originalColumnName: str
    parameterType: str = "str"
    parameterValue: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "parameterName": "reportDate",
                "originalColumnName": "bill_date",
                "parameterType": "datetime",
                "parameterValue": "${reportDate}"
            }
        }


class TabContent(BaseModel):
    """UI tab content item."""
    
    contentName: str
    contentDescription: str


class Tab(BaseModel):
    """UI tab definition."""
    
    tabName: str
    tabDescription: str
    tabType: str
    tabContent: List[TabContent] = []


class Report(BaseModel):
    """Complete report metadata."""
    
    reportId: str
    reportName: str
    reportDescription: Optional[str] = None
    reportType: Optional[str] = None
    reportFormatSpecId: Optional[str] = None
    reportDomainId: Optional[str] = None
    reportBuilder: Optional[str] = None
    
    columns: List[Column] = []
    parameters: List[Parameter] = []
    tabs: List[Tab] = []
    
    createdBy: str = "system"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedBy: str = "system"
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    
    # Vector embeddings for RAG (optional)
    embeddings: Optional[List[float]] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: lambda v: str(v)
        }
        json_schema_extra = {
            "example": {
                "reportId": "200012",
                "reportName": "Client Metrics Queries",
                "reportDescription": "Client Metrics report for transaction analysis",
                "reportType": "Client Metrics",
                "columns": [],
                "parameters": [],
                "createdBy": "system"
            }
        }


class ReportCreate(BaseModel):
    """Schema for creating a new report."""
    
    reportId: str
    reportName: str
    reportType: Optional[str] = None
    columns: List[Column] = []
    parameters: List[Parameter] = []


class ReportUpdate(BaseModel):
    """Schema for updating a report."""

    reportName: Optional[str] = None
    reportDescription: Optional[str] = None
    reportType: Optional[str] = None
    columns: Optional[List[Column]] = None
    parameters: Optional[List[Parameter]] = None
    updatedBy: str = "system"


class FixFieldRequest(BaseModel):
    """Request to fix a single report field."""
    reportId: str                 # Current reportId (for lookup, may be empty string)
    sessionId: Optional[str] = None  # Session ID for pending uploads (not yet saved)
    field: str                    # e.g. "reportId", "reportName", "columns[3].columnName"
    value: str                    # The new value


class FixFieldResponse(BaseModel):
    """Response for a fix-field operation."""
    valid: bool
    field: str
    currentValue: Optional[str] = None
    newValue: str
    message: str                  # Success or error message
    validation: Optional[Dict[str, Any]] = None  # Updated ValidationResult (only on success)


class RemoveDuplicateColumnsRequest(BaseModel):
    """Request to remove duplicate columns."""
    reportId: str
    sessionId: Optional[str] = None
    indicesToRemove: List[int]  # Column indices to remove


class RemoveDuplicateColumnsResponse(BaseModel):
    """Response for removing duplicate columns."""
    success: bool
    message: str
    validation: Optional[Dict[str, Any]] = None  # Updated ValidationResult


class ReportResponse(Report):
    """Response model for report."""
    
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    
    class Config:
        populate_by_name = True


class ReportListResponse(BaseModel):
    """Response for listing reports."""
    
    reports: List[ReportResponse]
    total: int
    page: int
    pageSize: int
    hasMore: bool
