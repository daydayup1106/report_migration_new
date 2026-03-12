"""MongoDB service for report and role persistence."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Optional, Dict
from datetime import datetime
import logging

from app.models.report import Report, ReportResponse
from app.models.role import Role, RoleResponse
from app.models.report_config import ReportConfig
from app.models.report_ui_settings import ReportUiSettings
from app.models.migration_log import MigrationLog
from app.config import settings

logger = logging.getLogger(__name__)


class MongoDBService:
    """MongoDB database service."""
    
    def __init__(self):
        """Initialize MongoDB connection."""
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
        self.reports_collection = None
        self.roles_collection = None
        self.report_configs_collection = None
        self.report_ui_settings_collection = None
        self.migration_logs_collection = None
    
    async def connect(self):
        """Connect to MongoDB."""
        try:
            self.client = AsyncIOMotorClient(settings.mongodb_url)
            self.db = self.client[settings.database_name]
            self.reports_collection = self.db.reports
            self.roles_collection = self.db.roles
            self.report_configs_collection = self.db.report_configs
            self.report_ui_settings_collection = self.db.report_ui_settings
            self.migration_logs_collection = self.db.migration_logs
            
            # Create indexes
            await self._create_indexes()
            
            logger.info(f"Connected to MongoDB: {settings.database_name}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    async def _create_indexes(self):
        """Create database indexes for performance."""
        # Report indexes
        await self.reports_collection.create_index("reportId", unique=True)
        await self.reports_collection.create_index("reportName")
        await self.reports_collection.create_index("reportType")
        await self.reports_collection.create_index("createdAt")
        
        # Role indexes
        await self.roles_collection.create_index(
            [("reportId", 1), ("environment", 1)],
            unique=True
        )

        # Report config indexes
        await self.report_configs_collection.create_index("reportId", unique=True)

        # Report UI settings indexes
        await self.report_ui_settings_collection.create_index("reportId", unique=True)

        # Migration log indexes
        await self.migration_logs_collection.create_index("reportId")
        await self.migration_logs_collection.create_index("migratedAt")
        await self.migration_logs_collection.create_index("status")

        logger.debug("Database indexes created")
    
    # ==================== Report Operations ====================
    
    async def save_report(self, report: Report) -> str:
        """
        Save or update a report.
        
        Args:
            report: Report object to save
            
        Returns:
            Report ID
        """
        report_dict = report.model_dump(exclude={'id'}, by_alias=False)
        
        # Check if report exists
        existing = await self.reports_collection.find_one(
            {"reportId": report.reportId}
        )
        
        if existing:
            # Update existing report
            report_dict['updatedAt'] = datetime.utcnow()
            await self.reports_collection.update_one(
                {"reportId": report.reportId},
                {"$set": report_dict}
            )
            logger.info(f"Updated report {report.reportId}")
        else:
            # Insert new report
            await self.reports_collection.insert_one(report_dict)
            logger.info(f"Created new report {report.reportId}")
        
        return report.reportId
    
    async def get_report(self, report_id: str) -> Optional[Report]:
        """
        Get report by ID.
        
        Args:
            report_id: Report ID
            
        Returns:
            Report object or None
        """
        doc = await self.reports_collection.find_one({"reportId": report_id})
        if doc:
            return Report(**doc)
        return None
    
    async def list_reports(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        report_type: Optional[str] = None,
        sort_by: str = "updatedAt",
        sort_order: int = -1
    ) -> tuple[List[Report], int]:
        """
        List reports with pagination and filtering.
        
        Args:
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            search: Search query for name/description
            report_type: Filter by report type
            sort_by: Field to sort by
            sort_order: 1 for ascending, -1 for descending
            
        Returns:
            Tuple of (list of reports, total count)
        """
        # Build query
        query = {}
        
        if search:
            query["$or"] = [
                {"reportName": {"$regex": search, "$options": "i"}},
                {"reportDescription": {"$regex": search, "$options": "i"}},
                {"reportType": {"$regex": search, "$options": "i"}},
                {"reportId": {"$regex": search, "$options": "i"}}
            ]
        
        if report_type:
            query["reportType"] = report_type
        
        # Get total count
        total = await self.reports_collection.count_documents(query)
        
        # Get reports
        cursor = self.reports_collection.find(query)\
            .sort(sort_by, sort_order)\
            .skip(skip)\
            .limit(limit)
        
        reports = []
        async for doc in cursor:
            reports.append(Report(**doc))
        
        return reports, total
    
    async def delete_report(self, report_id: str) -> bool:
        """
        Delete a report.
        
        Args:
            report_id: Report ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        result = await self.reports_collection.delete_one(
            {"reportId": report_id}
        )
        
        if result.deleted_count > 0:
            # Cascade delete all associated data
            await self.roles_collection.delete_many({"reportId": report_id})
            await self.report_configs_collection.delete_many({"reportId": report_id})
            await self.report_ui_settings_collection.delete_many({"reportId": report_id})
            logger.info(f"Deleted report {report_id} and all associated data")
            return True
        
        return False
    
    async def get_report_types(self) -> List[str]:
        """Get list of unique report types."""
        types = await self.reports_collection.distinct("reportType")
        return [t for t in types if t]

    async def cascade_update_report_id(self, old_id: str, new_id: str) -> bool:
        """Update reportId across all 5 collections."""
        await self.reports_collection.update_one(
            {"reportId": old_id},
            {"$set": {"reportId": new_id, "updatedAt": datetime.utcnow()}},
        )
        await self.roles_collection.update_many(
            {"reportId": old_id}, {"$set": {"reportId": new_id}}
        )
        await self.report_configs_collection.update_one(
            {"reportId": old_id}, {"$set": {"reportId": new_id}}
        )
        await self.report_ui_settings_collection.update_one(
            {"reportId": old_id}, {"$set": {"reportId": new_id}}
        )
        await self.migration_logs_collection.update_many(
            {"reportId": old_id}, {"$set": {"reportId": new_id}}
        )
        logger.info(f"Cascade-updated reportId from '{old_id}' to '{new_id}' across all collections")
        return True

    # ==================== Role Operations ====================
    
    async def save_roles(self, report_id: str, roles: List[Role]) -> int:
        """
        Save role configurations for a report.
        
        Args:
            report_id: Report ID
            roles: List of Role objects
            
        Returns:
            Number of roles saved
        """
        count = 0
        
        for role in roles:
            role_dict = role.model_dump(exclude={'id'}, by_alias=False)
            
            # Upsert by reportId + environment
            await self.roles_collection.update_one(
                {
                    "reportId": report_id,
                    "environment": role.environment
                },
                {"$set": role_dict},
                upsert=True
            )
            count += 1
        
        logger.info(f"Saved {count} role configurations for report {report_id}")
        return count
    
    async def get_role(
        self,
        report_id: str,
        environment: str
    ) -> Optional[Role]:
        """
        Get role configuration for specific environment.
        
        Args:
            report_id: Report ID
            environment: Environment (dev/sit/uat/prod)
            
        Returns:
            Role object or None
        """
        doc = await self.roles_collection.find_one({
            "reportId": report_id,
            "environment": environment
        })
        
        if doc:
            return Role(**doc)
        return None
    
    async def get_all_roles(self, report_id: str) -> List[Role]:
        """
        Get all role configurations for a report.
        
        Args:
            report_id: Report ID
            
        Returns:
            List of Role objects
        """
        cursor = self.roles_collection.find({"reportId": report_id})
        roles = []
        
        async for doc in cursor:
            roles.append(Role(**doc))
        
        return roles
    
    async def update_role(
        self,
        report_id: str,
        environment: str,
        updates: Dict
    ) -> bool:
        """
        Update role configuration.
        
        Args:
            report_id: Report ID
            environment: Environment
            updates: Dictionary of fields to update
            
        Returns:
            True if updated, False if not found
        """
        updates['updatedAt'] = datetime.utcnow()
        
        result = await self.roles_collection.update_one(
            {
                "reportId": report_id,
                "environment": environment
            },
            {"$set": updates}
        )
        
        return result.modified_count > 0
    
    # ==================== Report Config Operations ====================

    async def save_report_config(self, config: ReportConfig) -> str:
        """Save or update report configuration."""
        config_dict = config.model_dump(by_alias=False)

        await self.report_configs_collection.update_one(
            {"reportId": config.reportId},
            {"$set": config_dict},
            upsert=True
        )
        logger.info(f"Saved report config for {config.reportId}")
        return config.reportId

    async def get_report_config(self, report_id: str) -> Optional[ReportConfig]:
        """Get report configuration by report ID."""
        doc = await self.report_configs_collection.find_one({"reportId": report_id})
        if doc:
            return ReportConfig(**doc)
        return None

    # ==================== Report UI Settings Operations ====================

    async def save_report_ui_settings(self, ui_settings: ReportUiSettings) -> str:
        """Save or update report UI settings."""
        ui_dict = ui_settings.model_dump(by_alias=False)

        await self.report_ui_settings_collection.update_one(
            {"reportId": ui_settings.reportId},
            {"$set": ui_dict},
            upsert=True
        )
        logger.info(f"Saved UI settings for {ui_settings.reportId}")
        return ui_settings.reportId

    async def get_report_ui_settings(self, report_id: str) -> Optional[ReportUiSettings]:
        """Get report UI settings by report ID."""
        doc = await self.report_ui_settings_collection.find_one({"reportId": report_id})
        if doc:
            return ReportUiSettings(**doc)
        return None

    # ==================== Migration Log Operations ====================

    async def save_migration_log(self, log: MigrationLog) -> str:
        """Insert a migration log entry."""
        log_dict = log.model_dump(by_alias=False)
        result = await self.migration_logs_collection.insert_one(log_dict)
        logger.info(f"Saved migration log for {log.reportId} (status={log.status})")
        return str(result.inserted_id)

    async def get_migration_logs(
        self,
        report_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[MigrationLog], int]:
        """List migration logs with optional filtering."""
        query: Dict = {}
        if report_id:
            query["reportId"] = report_id
        if status:
            query["status"] = status

        total = await self.migration_logs_collection.count_documents(query)
        cursor = self.migration_logs_collection.find(query)\
            .sort("migratedAt", -1)\
            .skip(skip)\
            .limit(limit)

        logs = []
        async for doc in cursor:
            logs.append(MigrationLog(**doc))
        return logs, total

    # ==================== Statistics ====================
    
    async def get_statistics(self) -> Dict:
        """Get database statistics."""
        total_reports = await self.reports_collection.count_documents({})
        
        # Get reports created today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_reports = await self.reports_collection.count_documents({
            "createdAt": {"$gte": today_start}
        })
        
        # Get report types distribution
        pipeline = [
            {"$group": {"_id": "$reportType", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        type_distribution = await self.reports_collection.aggregate(pipeline).to_list(10)
        
        return {
            "totalReports": total_reports,
            "reportsToday": today_reports,
            "typeDistribution": type_distribution
        }


# Global instance
db_service = MongoDBService()
