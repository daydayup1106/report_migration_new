"""Statistics and analytics endpoints."""

from fastapi import APIRouter
from typing import Dict
import logging

from app.services import db_service

router = APIRouter(prefix="/api/stats", tags=["statistics"])
logger = logging.getLogger(__name__)


@router.get("")
async def get_statistics() -> Dict:
    """
    Get database statistics and analytics.
    
    Returns:
        Statistics including report counts, types distribution, etc.
    """
    stats = await db_service.get_statistics()
    
    return {
        "success": True,
        "data": stats
    }


@router.get("/dashboard")
async def get_dashboard_stats() -> Dict:
    """
    Get statistics optimized for dashboard display.
    
    Returns:
        Dashboard-ready statistics
    """
    stats = await db_service.get_statistics()
    
    # Format for dashboard
    dashboard_stats = {
        "totalReports": {
            "value": stats["totalReports"],
            "label": "Total Reports",
            "change": None  # Could calculate change from previous period
        },
        "reportsToday": {
            "value": stats["reportsToday"],
            "label": "Processed Today",
            "change": f"+{stats['reportsToday']}"
        },
        "topTypes": [
            {
                "type": item["_id"] or "Uncategorized",
                "count": item["count"]
            }
            for item in stats.get("typeDistribution", [])
        ]
    }
    
    return dashboard_stats
