"""API routes package."""

from .upload import router as upload_router
from .reports import router as reports_router
from .roles import router as roles_router
from .stats import router as stats_router

__all__ = [
    "upload_router",
    "reports_router",
    "roles_router",
    "stats_router"
]
