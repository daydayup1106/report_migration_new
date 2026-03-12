"""LangChain-based AI enhancement service for reports."""

from typing import List, Dict
import logging
import asyncio

from app.models.report import Report, Column
from app.config import settings

logger = logging.getLogger(__name__)


class LangChainProcessor:
    """Process and enhance reports using LangChain and Claude."""

    def __init__(self):
        """Initialize LangChain with Claude Sonnet (graceful if not installed)."""
        self.llm = None
        self.ai_available = False

        try:
            from langchain_anthropic import ChatAnthropic

            self.llm = ChatAnthropic(
                model="claude-sonnet-4-20250514",
                anthropic_api_key=settings.anthropic_api_key,
                temperature=0.3,
                max_tokens=1000,
            )
            self.ai_available = True
            logger.info("LangChain processor initialized with Claude Sonnet 4")
        except Exception as e:
            logger.warning(f"LangChain AI unavailable: {e}. Enhancement will use fallbacks.")
    
    async def enhance_report(self, report: Report) -> Report:
        """
        Enhance report with AI-generated content.

        Args:
            report: Report object to enhance

        Returns:
            Enhanced Report object
        """
        if not self.ai_available:
            logger.info(f"AI unavailable — skipping enhancement for report {report.reportId}")
            # Apply basic fallbacks
            if not report.reportDescription or len(report.reportDescription) < 20:
                report.reportDescription = f"Report for {report.reportName}"
            for col in report.columns:
                if not col.columnDescription or len(col.columnDescription) < 5:
                    col.columnDescription = f"{col.columnName} from {col.originalColumnName}"
            return report

        logger.info(f"Enhancing report {report.reportId}")

        # Generate report description if missing
        if not report.reportDescription or len(report.reportDescription) < 20:
            try:
                report.reportDescription = await self._generate_report_description(report)
                logger.debug(f"Generated report description: {report.reportDescription[:100]}...")
            except Exception as e:
                logger.error(f"Failed to generate report description: {e}")
                report.reportDescription = f"Report for {report.reportName}"

        # Enhance column descriptions in parallel
        enhanced_columns = await self._enhance_columns_batch(report)
        report.columns = enhanced_columns

        logger.info(
            f"Report {report.reportId} enhanced: "
            f"{len([c for c in enhanced_columns if c.columnDescription])} columns with descriptions"
        )

        return report
    
    async def _generate_report_description(self, report: Report) -> str:
        """Generate overall report description using LLM."""
        from langchain.prompts import PromptTemplate

        # Build column summary
        column_names = [c.columnName for c in report.columns[:10]]
        column_summary = ", ".join(column_names)
        if len(report.columns) > 10:
            column_summary += f", and {len(report.columns) - 10} more"

        prompt = PromptTemplate(
            input_variables=["report_name", "report_type", "column_count", "columns"],
            template="""You are a data analyst documenting a business intelligence report.

Report Name: {report_name}
Report Type: {report_type}
Number of Columns: {column_count}
Key Columns: {columns}

Generate a clear, professional description (2-3 sentences, max 150 characters) that explains:
- What business insights this report provides
- What data it tracks or analyzes
- Who would use this report

Keep it concise and business-focused.

Description:"""
        )
        
        chain = prompt | self.llm
        
        try:
            result = await chain.ainvoke({
                "report_name": report.reportName,
                "report_type": report.reportType or "General",
                "column_count": len(report.columns),
                "columns": column_summary
            })
            
            description = result.content.strip()
            
            # Ensure it's not too long
            if len(description) > 200:
                description = description[:197] + "..."
            
            return description
            
        except Exception as e:
            logger.error(f"Error generating description: {e}")
            return f"{report.reportName} - {report.reportType or 'Report'}"
    
    async def _enhance_columns_batch(self, report: Report) -> List[Column]:
        """Enhance multiple columns in parallel with rate limiting."""
        
        # Process in batches to avoid rate limits
        batch_size = 5
        enhanced_columns = []
        
        for i in range(0, len(report.columns), batch_size):
            batch = report.columns[i:i + batch_size]
            
            # Process batch in parallel
            tasks = [
                self._enhance_column(col, report) 
                for col in batch
            ]
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle results and exceptions
            for col, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to enhance column {col.columnName}: {result}")
                    enhanced_columns.append(col)
                else:
                    enhanced_columns.append(result)
            
            # Small delay between batches
            if i + batch_size < len(report.columns):
                await asyncio.sleep(0.5)
        
        return enhanced_columns
    
    async def _enhance_column(self, column: Column, report: Report) -> Column:
        """Enhance individual column with AI-generated description."""
        from langchain.prompts import PromptTemplate

        # Skip if already has good description
        if column.columnDescription and len(column.columnDescription) > 30:
            return column

        prompt = PromptTemplate(
            input_variables=[
                "column_name", 
                "original_name", 
                "data_type", 
                "report_type"
            ],
            template="""You are analyzing a database column in a financial report.

Report Type: {report_type}
Column Display Name: {column_name}
Database Column: {original_name}
Data Type: {data_type}

Generate a concise, professional description (max 80 characters) explaining:
- What data this column contains
- How it's used in business context

Be specific and business-focused. No generic descriptions.

Description:"""
        )
        
        chain = prompt | self.llm
        
        try:
            result = await chain.ainvoke({
                "column_name": column.columnName,
                "original_name": column.originalColumnName,
                "data_type": column.dataType,
                "report_type": report.reportType or "General"
            })
            
            description = result.content.strip()
            
            # Clean up and truncate
            description = description.replace('"', '').replace("'", "")
            if len(description) > 100:
                description = description[:97] + "..."
            
            column.columnDescription = description
            
        except Exception as e:
            logger.warning(
                f"Failed to enhance column {column.columnName}: {e}. "
                f"Using fallback description."
            )
            # Fallback description
            column.columnDescription = f"{column.columnName} from {column.originalColumnName}"
        
        return column
    
    # validate_report() has been moved to ReportValidator (report_validator.py)
    # which provides deterministic + AI semantic validation with severity levels.
