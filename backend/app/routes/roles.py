"""Role management endpoints."""

from fastapi import APIRouter, HTTPException, Path
from typing import List
import logging

from app.models.role import Role, RoleResponse, RoleUpdate
from app.services import db_service

router = APIRouter(prefix="/api/roles", tags=["roles"])
logger = logging.getLogger(__name__)


@router.get("/{report_id}", response_model=List[RoleResponse])
async def get_all_roles(
    report_id: str = Path(..., description="Report ID")
) -> List[RoleResponse]:
    """
    Get all role configurations for a report (all environments).
    
    Args:
        report_id: Report ID
        
    Returns:
        List of role configurations
    """
    # Verify report exists
    report = await db_service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report {report_id} not found"
        )
    
    roles = await db_service.get_all_roles(report_id)
    
    return [RoleResponse(**r.model_dump()) for r in roles]


@router.get("/{report_id}/{environment}", response_model=RoleResponse)
async def get_role(
    report_id: str = Path(..., description="Report ID"),
    environment: str = Path(..., description="Environment (dev/sit/uat/prod)")
) -> RoleResponse:
    """
    Get role configuration for specific environment.
    
    Args:
        report_id: Report ID
        environment: Environment name
        
    Returns:
        Role configuration
    """
    # Validate environment
    if environment not in ['dev', 'sit', 'uat', 'prod']:
        raise HTTPException(
            status_code=400,
            detail="Invalid environment. Must be one of: dev, sit, uat, prod"
        )
    
    role = await db_service.get_role(report_id, environment)
    
    if not role:
        raise HTTPException(
            status_code=404,
            detail=f"Role not found for report {report_id} in {environment} environment"
        )
    
    return RoleResponse(**role.model_dump())


@router.put("/{report_id}/{environment}", response_model=RoleResponse)
async def update_role(
    report_id: str,
    environment: str,
    updates: RoleUpdate
):
    """
    Update role configuration for specific environment.
    
    Args:
        report_id: Report ID
        environment: Environment name
        updates: Fields to update
        
    Returns:
        Updated role configuration
    """
    # Validate environment
    if environment not in ['dev', 'sit', 'uat', 'prod']:
        raise HTTPException(
            status_code=400,
            detail="Invalid environment. Must be one of: dev, sit, uat, prod"
        )
    
    # Get existing role
    role = await db_service.get_role(report_id, environment)
    
    if not role:
        raise HTTPException(
            status_code=404,
            detail=f"Role not found for report {report_id} in {environment} environment"
        )
    
    # Apply updates
    update_dict = updates.model_dump(exclude_unset=True)
    updated = await db_service.update_role(report_id, environment, update_dict)
    
    if not updated:
        raise HTTPException(
            status_code=500,
            detail="Failed to update role"
        )
    
    # Get updated role
    updated_role = await db_service.get_role(report_id, environment)
    
    logger.info(f"Updated role for report {report_id} in {environment}")
    
    return RoleResponse(**updated_role.model_dump())


@router.get("/{report_id}/{environment}/download")
async def download_role_json(report_id: str, environment: str):
    """
    Download role configuration as JSON file.
    
    Args:
        report_id: Report ID
        environment: Environment name
        
    Returns:
        JSON file download
    """
    from fastapi.responses import JSONResponse
    
    if environment not in ['dev', 'sit', 'uat', 'prod']:
        raise HTTPException(
            status_code=400,
            detail="Invalid environment"
        )
    
    role = await db_service.get_role(report_id, environment)
    
    if not role:
        raise HTTPException(
            status_code=404,
            detail=f"Role not found"
        )
    
    role_dict = role.model_dump(exclude={'id', 'createdAt', 'updatedAt'})
    
    return JSONResponse(
        content=role_dict,
        headers={
            "Content-Disposition": f"attachment; filename=roles-{environment}.json"
        }
    )
