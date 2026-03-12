"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.services import db_service
from app.routes import (
    upload_router,
    reports_router,
    roles_router,
    stats_router
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("🚀 Report Migration System Starting...")
    logger.info(f"📊 Database: {settings.database_name}")
    
    # Connect to MongoDB
    await db_service.connect()
    
    logger.info("✅ Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down...")
    await db_service.close()
    logger.info("✅ Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Report Migration System",
    description="AI-powered report metadata migration and management system",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(upload_router)
app.include_router(reports_router)
app.include_router(roles_router)
app.include_router(stats_router)


# Health check endpoints
@app.get("/")
async def root():
    """Root endpoint - API status."""
    return {
        "message": "Report Migration System API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check MongoDB connection
        stats = await db_service.get_statistics()
        
        return {
            "status": "healthy",
            "database": "connected",
            "reports": stats.get("totalReports", 0)
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.get("/api/info")
async def api_info():
    """Get API information and available endpoints."""
    return {
        "title": "Report Migration System API",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/upload - Upload and process Excel files",
            "reports": "/api/reports - Manage reports (CRUD)",
            "roles": "/api/roles - Manage role configurations",
            "stats": "/api/stats - Get statistics",
            "docs": "/api/docs - Interactive API documentation"
        },
        "features": [
            "Excel parsing and validation",
            "AI-powered metadata enhancement using Claude",
            "MongoDB storage with full-text search",
            "Role-based access control per environment",
            "RESTful API with OpenAPI documentation"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info"
    )
