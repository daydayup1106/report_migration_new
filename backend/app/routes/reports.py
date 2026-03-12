"""Report CRUD endpoints."""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
import logging
import json
import io
import zipfile

from app.models.report import (
    Report,
    ReportResponse,
    ReportListResponse,
    ReportUpdate,
    FixFieldRequest,
    FixFieldResponse,
    RemoveDuplicateColumnsRequest,
    RemoveDuplicateColumnsResponse,
)
from app.services import db_service, ReportValidator
from app.services.field_fix_service import FieldFixService

router = APIRouter(prefix="/api/reports", tags=["reports"])
logger = logging.getLogger(__name__)

# Initialize field fix service
_report_validator = ReportValidator()
_field_fix_service = FieldFixService(db_service, _report_validator)


@router.post("/fix-field", response_model=FixFieldResponse)
async def fix_field(request: FixFieldRequest) -> FixFieldResponse:
    """
    Fix a single field on a report.

    Validates the proposed value deterministically. If valid, applies the
    update and re-runs full validation. If invalid, returns an error message
    without modifying anything.

    NOTE: This endpoint also handles pending uploads (not yet saved to DB).
    It checks the pending_uploads dict from upload.py via sessionId lookup.
    """
    # Import here to avoid circular dependency
    from app.routes.upload import pending_uploads

    # If sessionId provided, use it directly
    if request.sessionId and request.sessionId in pending_uploads:
        report, roles, config, ui_settings, file_info = pending_uploads[request.sessionId]
        return await _field_fix_service.fix_pending(
            report, roles, config, ui_settings, request.field, request.value, request.sessionId
        )

    # Otherwise, search by reportId (for backward compatibility or saved reports)
    pending_session_id = None
    pending_data = None

    for session_id, (report, roles, config, ui_settings, file_info) in pending_uploads.items():
        if report.reportId == request.reportId:
            pending_session_id = session_id
            pending_data = (report, roles, config, ui_settings, file_info)
            break

    if pending_data:
        # Report is pending - fix in memory
        report, roles, config, ui_settings, file_info = pending_data
        return await _field_fix_service.fix_pending(
            report, roles, config, ui_settings, request.field, request.value, pending_session_id
        )
    else:
        # Report is saved - fix in database
        return await _field_fix_service.fix(request.reportId, request.field, request.value)


@router.post("/remove-duplicate-columns", response_model=RemoveDuplicateColumnsResponse)
async def remove_duplicate_columns(request: RemoveDuplicateColumnsRequest) -> RemoveDuplicateColumnsResponse:
    """
    Remove duplicate columns from a report (pending or saved).

    This is used when the user resolves duplicate column errors by selecting
    which columns to keep. The unselected duplicates are removed.
    """
    from app.routes.upload import pending_uploads

    # Check if sessionId provided (pending upload)
    if request.sessionId and request.sessionId in pending_uploads:
        report, roles, config, ui_settings, file_info = pending_uploads[request.sessionId]

        # Remove columns by index (in reverse order to avoid index shifting)
        for idx in sorted(request.indicesToRemove, reverse=True):
            if 0 <= idx < len(report.columns):
                report.columns.pop(idx)

        # Update pending_uploads with modified report
        pending_uploads[request.sessionId] = (report, roles, config, ui_settings, file_info)

        # Re-validate
        validation_result = await _report_validator.validate(report)

        logger.info(
            f"Removed {len(request.indicesToRemove)} duplicate columns from pending report "
            f"'{report.reportId}' (session: {request.sessionId})"
        )

        return RemoveDuplicateColumnsResponse(
            success=True,
            message=f"Removed {len(request.indicesToRemove)} duplicate column(s).",
            validation=validation_result.model_dump(),
        )

    # Otherwise, work with saved report
    report = await db_service.get_report(request.reportId)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report '{request.reportId}' not found.")

    # Remove columns
    for idx in sorted(request.indicesToRemove, reverse=True):
        if 0 <= idx < len(report.columns):
            report.columns.pop(idx)

    # Save updated report
    await db_service.save_report(report)

    # Re-validate
    validation_result = await _report_validator.validate(report)

    logger.info(
        f"Removed {len(request.indicesToRemove)} duplicate columns from report '{request.reportId}'"
    )

    return RemoveDuplicateColumnsResponse(
        success=True,
        message=f"Removed {len(request.indicesToRemove)} duplicate column(s).",
        validation=validation_result.model_dump(),
    )


@router.get("", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    reportType: Optional[str] = Query(None, description="Filter by report type"),
    sortBy: str = Query("updatedAt", description="Sort field"),
    sortOrder: str = Query("desc", description="Sort order (asc/desc)")
) -> ReportListResponse:
    """
    List all reports with pagination, search, and filtering.
    
    Args:
        page: Page number (1-indexed)
        pageSize: Number of items per page
        search: Search in name, description, type
        reportType: Filter by specific report type
        sortBy: Field to sort by
        sortOrder: 'asc' or 'desc'
        
    Returns:
        Paginated list of reports
    """
    skip = (page - 1) * pageSize
    sort_direction = 1 if sortOrder.lower() == 'asc' else -1
    
    reports, total = await db_service.list_reports(
        skip=skip,
        limit=pageSize,
        search=search,
        report_type=reportType,
        sort_by=sortBy,
        sort_order=sort_direction
    )
    
    return ReportListResponse(
        reports=[ReportResponse(**r.model_dump()) for r in reports],
        total=total,
        page=page,
        pageSize=pageSize,
        hasMore=(skip + len(reports)) < total
    )


@router.get("/pending/{session_id}", response_model=ReportResponse)
async def get_pending_report(session_id: str) -> ReportResponse:
    """
    Get a pending report by sessionId (from pending_uploads memory).

    This is used to fetch report details during the confirmation flow
    before the report is saved to the database.
    """
    from app.routes.upload import pending_uploads

    if session_id not in pending_uploads:
        raise HTTPException(
            status_code=404,
            detail=f"No pending report found for session {session_id}. It may have expired."
        )

    report, roles, config, ui_settings, file_info = pending_uploads[session_id]

    return ReportResponse(**report.model_dump())


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str) -> ReportResponse:
    """
    Get detailed information about a specific report.
    
    Args:
        report_id: Report ID
        
    Returns:
        Report details
    """
    report = await db_service.get_report(report_id)
    
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report {report_id} not found"
        )
    
    return ReportResponse(**report.model_dump())


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str,
    updates: ReportUpdate
) -> ReportResponse:
    """
    Update report metadata.
    
    Args:
        report_id: Report ID
        updates: Fields to update
        
    Returns:
        Updated report
    """
    # Get existing report
    report = await db_service.get_report(report_id)
    
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report {report_id} not found"
        )
    
    # Apply updates
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(report, field):
            setattr(report, field, value)
    
    # Save updated report
    await db_service.save_report(report)
    
    logger.info(f"Updated report {report_id}")
    
    return ReportResponse(**report.model_dump())


@router.delete("/{report_id}")
async def delete_report(report_id: str):
    """
    Delete a report and its associated roles.
    
    Args:
        report_id: Report ID to delete
        
    Returns:
        Success message
    """
    deleted = await db_service.delete_report(report_id)
    
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Report {report_id} not found"
        )
    
    logger.info(f"Deleted report {report_id}")
    
    return {
        "success": True,
        "message": f"Report {report_id} deleted successfully"
    }


@router.get("/{report_id}/download")
async def download_report_json(report_id: str):
    """
    Download report metadata as JSON file.
    
    Args:
        report_id: Report ID
        
    Returns:
        JSON file download
    """
    from fastapi.responses import JSONResponse
    
    report = await db_service.get_report(report_id)
    
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report {report_id} not found"
        )
    
    # Convert to dict and clean up
    report_dict = report.model_dump(exclude={'embeddings'})
    
    return JSONResponse(
        content=report_dict,
        headers={
            "Content-Disposition": f"attachment; filename={report_id}.json"
        }
    )


@router.get("/types/list")
async def get_report_types() -> List[str]:
    """
    Get list of all unique report types.

    Returns:
        List of report types
    """
    types = await db_service.get_report_types()
    return types


@router.get("/{report_id}/download-all")
async def download_all_report_files(report_id: str):
    """
    Download all report-related JSON files as a ZIP archive.

    This includes:
    - report.json (main report metadata)
    - roles.json (all roles/environments for this report)
    - config.json (report configuration)
    - ui_settings.json (UI settings)

    Args:
        report_id: Report ID

    Returns:
        ZIP file containing all JSON files
    """
    try:
        # Fetch all related data
        report = await db_service.get_report(report_id)
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report {report_id} not found"
            )

        roles = await db_service.get_all_roles(report_id)
        config = await db_service.get_report_config(report_id)
        ui_settings = await db_service.get_report_ui_settings(report_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report data for {report_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching report data: {str(e)}"
        )

    # Create ZIP file in memory
    zip_buffer = io.BytesIO()

    try:
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add report.json (using model_dump_json for proper datetime serialization)
            report_json = report.model_dump_json(exclude={'embeddings'}, indent=2)
            zip_file.writestr(
                f"{report_id}/report.json",
                report_json
            )

            # Add roles.json
            if roles and len(roles) > 0:
                # Create a list of role dicts and serialize with proper datetime handling
                roles_data = [role.model_dump(mode='json') for role in roles]
                zip_file.writestr(
                    f"{report_id}/roles.json",
                    json.dumps(roles_data, indent=2, ensure_ascii=False, default=str)
                )

            # Add config.json
            if config:
                config_json = config.model_dump_json(indent=2)
                zip_file.writestr(
                    f"{report_id}/config.json",
                    config_json
                )

            # Add ui_settings.json
            if ui_settings:
                ui_settings_json = ui_settings.model_dump_json(indent=2)
                zip_file.writestr(
                    f"{report_id}/ui_settings.json",
                    ui_settings_json
                )
    except Exception as e:
        logger.error(f"Error creating ZIP for report {report_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error creating ZIP file: {str(e)}"
        )

    zip_buffer.seek(0)

    logger.info(f"Generated ZIP download for report {report_id}")

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={report_id}_export.zip"}
    )
