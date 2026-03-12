# Report Migration System - Implementation Guide

## 🚀 Quick Start (30 minutes to running system)

### Prerequisites
```bash
✓ Python 3.10+
✓ Node.js 18+
✓ MongoDB (running locally)
✓ Anthropic API Key
```

---

## Step 1: Project Initialization (5 min)

```bash
# Create project structure
mkdir report-migration && cd report-migration
mkdir -p backend/app/{models,services,routes,utils} backend/prompts
mkdir -p frontend/src/{components,pages,hooks,services,store,types}

# Initialize git
git init
echo "node_modules/
__pycache__/
.env
*.pyc
.DS_Store
dist/" > .gitignore
```

---

## Step 2: Backend Setup (10 min)

### Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
python-multipart==0.0.6
openpyxl==3.1.2
pandas==2.1.4
pymongo==4.6.1
motor==3.3.2
langchain==0.1.4
langchain-anthropic==0.1.1
chromadb==0.4.22
python-dotenv==1.0.0
aiofiles==23.2.1
EOF

pip install -r requirements.txt
```

### Environment Configuration
```bash
# Create .env file
cat > .env << 'EOF'
ANTHROPIC_API_KEY=your_api_key_here
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=report_migration
VECTOR_STORE_PATH=./chromadb
MAX_FILE_SIZE_MB=10
CORS_ORIGINS=["http://localhost:3000"]
EOF
```

---

## Step 3: Backend Core Files

### 1. Configuration (app/config.py)
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    anthropic_api_key: str
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "report_migration"
    vector_store_path: str = "./chromadb"
    max_file_size_mb: int = 10
    cors_origins: List[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 2. Models (app/models/report.py)
```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class Column(BaseModel):
    columnName: str
    columnDescription: str
    originalColumnName: str
    dataType: str

class Parameter(BaseModel):
    parameterName: str
    originalColumnName: str
    parameterType: str
    parameterValue: Optional[str] = None

class Report(BaseModel):
    reportId: str
    reportName: str
    reportDescription: Optional[str] = None
    reportType: Optional[str] = None
    reportFormatSpecId: Optional[str] = None
    reportDomainId: Optional[str] = None
    reportBuilder: Optional[str] = None
    columns: List[Column]
    parameters: Optional[List[Parameter]] = []
    createdBy: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedBy: str
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True

class Role(BaseModel):
    reportId: str
    reportName: str
    environment: str  # dev, sit, uat, prod
    reportRoleId: int
    reportAvailable: dict
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
```

### 3. Excel Parser (app/services/excel_parser.py)
```python
import openpyxl
from typing import Dict, List, Tuple
from ..models.report import Report, Column, Parameter

class ExcelParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.wb = openpyxl.load_workbook(file_path)
        self.ws = self.wb.active
    
    def parse(self) -> Tuple[Report, List[Dict]]:
        """Parse Excel and return Report object and roles data"""
        # Extract basic metadata
        report_data = self._extract_metadata()
        
        # Extract columns
        columns = self._extract_columns()
        
        # Extract parameters
        parameters = self._extract_parameters()
        
        # Create Report object
        report = Report(
            reportId=report_data['reportId'],
            reportName=report_data['reportName'],
            reportFormatSpecId=report_data.get('formatSpecId'),
            reportDomainId=report_data.get('domainId'),
            columns=columns,
            parameters=parameters,
            createdBy="system",
            updatedBy="system"
        )
        
        # Extract roles (if present)
        roles = self._extract_roles(report_data['reportId'])
        
        return report, roles
    
    def _extract_metadata(self) -> Dict:
        """Extract report-level metadata from first few rows"""
        metadata = {}
        for row in self.ws.iter_rows(min_row=1, max_row=10, values_only=True):
            if row[0] and row[1]:
                key = str(row[0]).strip()
                value = row[1]
                
                if key == 'reportName':
                    metadata['reportName'] = str(value)
                elif key == 'reportId':
                    metadata['reportId'] = str(value)
                elif key == 'formatSpecId':
                    metadata['formatSpecId'] = str(value)
                elif key == 'domainId':
                    metadata['domainId'] = str(value)
        
        return metadata
    
    def _extract_columns(self) -> List[Column]:
        """Extract column definitions"""
        columns = []
        in_columns_section = False
        
        for row in self.ws.iter_rows(values_only=True):
            # Find "Columns" section
            if row[0] == 'Columns':
                in_columns_section = True
                continue
            
            # Skip header row
            if in_columns_section and row[0] == 'columnName':
                continue
            
            # Break on empty row or new section
            if in_columns_section and (not row[0] or row[0] == 'Parameters'):
                break
            
            # Parse column data
            if in_columns_section and row[0]:
                columns.append(Column(
                    columnName=str(row[0]),
                    originalColumnName=str(row[1]) if row[1] else "",
                    columnDescription=str(row[2]) if row[2] else "",
                    dataType=str(row[3]) if row[3] else "str"
                ))
        
        return columns
    
    def _extract_parameters(self) -> List[Parameter]:
        """Extract parameter definitions"""
        parameters = []
        in_params_section = False
        
        for row in self.ws.iter_rows(values_only=True):
            # Find "Parameters" section
            if row[0] == 'Parameters':
                in_params_section = True
                continue
            
            # Skip header row
            if in_params_section and row[0] == 'parameterName':
                continue
            
            # Break on empty row
            if in_params_section and not row[0]:
                break
            
            # Parse parameter data
            if in_params_section and row[0]:
                parameters.append(Parameter(
                    parameterName=str(row[0]),
                    originalColumnName=str(row[1]) if row[1] else "",
                    parameterType=str(row[2]) if row[2] else "str"
                ))
        
        return parameters
    
    def _extract_roles(self, report_id: str) -> List[Dict]:
        """Extract role definitions for different environments"""
        # This would be in a separate sheet or file
        # For now, return default structure
        environments = ['dev', 'sit', 'uat', 'prod']
        roles = []
        
        for env in environments:
            roles.append({
                'reportId': report_id,
                'environment': env,
                'reportRoleId': 391,  # Default
                'reportAvailable': {
                    'user': 'Yes',
                    'SystemAdminOnly': 'No',
                    'tester': 'Yes'
                }
            })
        
        return roles
```

### 4. LangChain Processor (app/services/langchain_processor.py)
```python
from langchain_anthropic import ChatAnthropic
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from typing import List
from ..models.report import Report, Column
from ..config import settings

class LangChainProcessor:
    def __init__(self):
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            anthropic_api_key=settings.anthropic_api_key,
            temperature=0.3
        )
    
    async def enhance_report(self, report: Report) -> Report:
        """Enhance report with AI-generated descriptions"""
        
        # Generate report description if missing
        if not report.reportDescription:
            report.reportDescription = await self._generate_report_description(report)
        
        # Enhance column descriptions
        enhanced_columns = []
        for column in report.columns:
            enhanced_column = await self._enhance_column(column, report)
            enhanced_columns.append(enhanced_column)
        
        report.columns = enhanced_columns
        return report
    
    async def _generate_report_description(self, report: Report) -> str:
        """Generate overall report description"""
        prompt = PromptTemplate(
            input_variables=["report_name", "report_type", "columns"],
            template="""You are a data analyst helping document a report.

Report Name: {report_name}
Report Type: {report_type}
Number of Columns: {columns}

Generate a clear, professional description (2-3 sentences) explaining:
- What this report tracks/analyzes
- Who would use this report
- Key insights it provides

Description:"""
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(
            report_name=report.reportName,
            report_type=report.reportType or "General",
            columns=len(report.columns)
        )
        
        return result.strip()
    
    async def _enhance_column(self, column: Column, report: Report) -> Column:
        """Enhance individual column description"""
        
        # Skip if already has good description
        if column.columnDescription and len(column.columnDescription) > 30:
            return column
        
        prompt = PromptTemplate(
            input_variables=[
                "column_name", 
                "original_name", 
                "data_type", 
                "report_name"
            ],
            template="""You are analyzing a database column in a report.

Report: {report_name}
Column Name: {column_name}
Database Column: {original_name}
Data Type: {data_type}

Generate a concise description (max 80 characters) explaining what this column contains and how it's used.

Description:"""
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(
            column_name=column.columnName,
            original_name=column.originalColumnName,
            data_type=column.dataType,
            report_name=report.reportName
        )
        
        column.columnDescription = result.strip()
        return column
    
    async def validate_report(self, report: Report) -> Dict[str, any]:
        """Validate report completeness and suggest improvements"""
        prompt = PromptTemplate(
            input_variables=["report_json"],
            template="""You are validating a report metadata structure.

Report Data:
{report_json}

Analyze and provide:
1. Completeness score (0-100)
2. Missing or unclear fields
3. Suggestions for improvement

Respond in JSON format:
{{
  "score": 85,
  "issues": ["missing report description", "column X needs description"],
  "suggestions": ["add report builder info", "clarify data types"]
}}

Response:"""
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(report_json=report.json())
        
        # Parse JSON response
        import json
        return json.loads(result.strip())
```

### 5. MongoDB Service (app/services/mongodb_service.py)
```python
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from ..config import settings
from ..models.report import Report, Role
from datetime import datetime

class MongoDBService:
    def __init__(self):
        self.client = AsyncIOMotorClient(settings.mongodb_url)
        self.db = self.client[settings.database_name]
        self.reports = self.db.reports
        self.roles = self.db.roles
    
    async def save_report(self, report: Report) -> str:
        """Save or update report"""
        report_dict = report.dict()
        
        # Check if exists
        existing = await self.reports.find_one({"reportId": report.reportId})
        
        if existing:
            # Update
            report_dict['updatedAt'] = datetime.utcnow()
            await self.reports.update_one(
                {"reportId": report.reportId},
                {"$set": report_dict}
            )
        else:
            # Insert
            await self.reports.insert_one(report_dict)
        
        return report.reportId
    
    async def save_roles(self, report_id: str, roles: List[dict]) -> int:
        """Save role configurations for all environments"""
        count = 0
        
        for role_data in roles:
            role = Role(**role_data)
            
            # Upsert by reportId + environment
            await self.roles.update_one(
                {
                    "reportId": report_id,
                    "environment": role.environment
                },
                {"$set": role.dict()},
                upsert=True
            )
            count += 1
        
        return count
    
    async def get_report(self, report_id: str) -> Optional[Report]:
        """Retrieve report by ID"""
        doc = await self.reports.find_one({"reportId": report_id})
        if doc:
            return Report(**doc)
        return None
    
    async def list_reports(
        self, 
        skip: int = 0, 
        limit: int = 20,
        search: Optional[str] = None
    ) -> List[Report]:
        """List all reports with pagination"""
        query = {}
        
        if search:
            query = {
                "$or": [
                    {"reportName": {"$regex": search, "$options": "i"}},
                    {"reportType": {"$regex": search, "$options": "i"}},
                    {"reportDescription": {"$regex": search, "$options": "i"}}
                ]
            }
        
        cursor = self.reports.find(query).skip(skip).limit(limit)
        reports = []
        
        async for doc in cursor:
            reports.append(Report(**doc))
        
        return reports
    
    async def get_roles(
        self, 
        report_id: str, 
        environment: str
    ) -> Optional[Role]:
        """Get roles for specific environment"""
        doc = await self.roles.find_one({
            "reportId": report_id,
            "environment": environment
        })
        
        if doc:
            return Role(**doc)
        return None
```

### 6. Main FastAPI App (app/main.py)
```python
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import tempfile
import os

from .config import settings
from .services.excel_parser import ExcelParser
from .services.langchain_processor import LangChainProcessor
from .services.mongodb_service import MongoDBService

# Initialize services
langchain_processor = LangChainProcessor()
mongodb_service = MongoDBService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Report Migration System Starting...")
    yield
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(
    title="Report Migration System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.get("/")
async def root():
    return {
        "message": "Report Migration System API",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/api/upload")
async def upload_excel(file: UploadFile = File(...)):
    """Upload and process Excel file"""
    
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files allowed")
    
    # Save temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Parse Excel
        parser = ExcelParser(tmp_path)
        report, roles = parser.parse()
        
        # Enhance with LLM
        report = await langchain_processor.enhance_report(report)
        
        # Save to MongoDB
        report_id = await mongodb_service.save_report(report)
        roles_count = await mongodb_service.save_roles(report_id, roles)
        
        return {
            "success": True,
            "reportId": report_id,
            "reportName": report.reportName,
            "columnsCount": len(report.columns),
            "rolesCount": roles_count
        }
    
    finally:
        # Cleanup
        os.unlink(tmp_path)

@app.get("/api/reports")
async def list_reports(skip: int = 0, limit: int = 20, search: str = None):
    """List all reports"""
    reports = await mongodb_service.list_reports(skip, limit, search)
    return {
        "reports": [r.dict() for r in reports],
        "count": len(reports)
    }

@app.get("/api/reports/{report_id}")
async def get_report(report_id: str):
    """Get single report"""
    report = await mongodb_service.get_report(report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report.dict()

@app.get("/api/reports/{report_id}/roles/{environment}")
async def get_roles(report_id: str, environment: str):
    """Get roles for environment"""
    if environment not in ['dev', 'sit', 'uat', 'prod']:
        raise HTTPException(400, "Invalid environment")
    
    roles = await mongodb_service.get_roles(report_id, environment)
    if not roles:
        raise HTTPException(404, "Roles not found")
    
    return roles.dict()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Step 4: Run Backend (2 min)

```bash
# Make sure MongoDB is running
# mongod --dbpath /your/data/path

# Start FastAPI
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload

# Test API
curl http://localhost:8000/
```

---

## Step 5: Frontend Setup (10 min)

```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install

# Install dependencies
npm install \
  react-router-dom \
  @tanstack/react-query \
  zustand \
  framer-motion \
  recharts \
  lucide-react \
  axios \
  date-fns \
  clsx \
  tailwind-merge

# Install dev dependencies
npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  @types/node

# Initialize Tailwind
npx tailwindcss init -p
```

---

## Step 6: Test Upload

```bash
# Upload example file
curl -X POST http://localhost:8000/api/upload \
  -F "file=@../prd_files/report migrations_200012.xlsx"

# Check results
curl http://localhost:8000/api/reports
```

---

## Next Steps

1. Complete frontend implementation (see COMPLETE_PROJECT_ARCHITECTURE.md)
2. Add RAG/query system
3. Build UI components
4. Add Docker deployment
5. Production hardening

Your backend is now ready to process Excel files! 🎉
