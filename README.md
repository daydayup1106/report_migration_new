# Report Migration System

> AI-Powered Report Metadata Migration and Management Platform

Transform Excel-based report definitions into structured JSON metadata with LangChain + Claude AI, store in MongoDB, and manage through a beautiful modern web interface.

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **MongoDB** (running on localhost:27017)
- **Anthropic API Key**

### Installation

```bash
# 1. Clone or navigate to project
cd D:\development\PyCharmWorkSpace\report_migration_new

# 2. Backend Setup
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Frontend Setup
cd ../frontend
npm install

# 4. Start MongoDB (if not running)
# mongod --dbpath C:\data\db
```

### Running the Application

```bash
# Terminal 1 - Backend (from backend folder)
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend (from frontend folder)
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

---

## 📁 Project Structure

```
report_migration_new/
├── backend/                          # Python FastAPI Backend
│   ├── app/
│   │   ├── models/                   # Pydantic data models
│   │   │   ├── __init__.py
│   │   │   ├── report.py            # Report models
│   │   │   └── role.py              # Role models
│   │   │
│   │   ├── services/                 # Business logic services
│   │   │   ├── __init__.py
│   │   │   ├── excel_parser.py      # Excel → Python parser
│   │   │   ├── langchain_processor.py # AI enhancement
│   │   │   └── mongodb_service.py   # Database operations
│   │   │
│   │   ├── routes/                   # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── upload.py            # File upload
│   │   │   ├── reports.py           # Report CRUD
│   │   │   ├── roles.py             # Role management
│   │   │   └── stats.py             # Statistics
│   │   │
│   │   ├── config.py                 # Configuration
│   │   └── main.py                   # FastAPI app
│   │
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment template
│   └── .env                          # Your config (create this)
│
├── frontend/                         # React TypeScript Frontend
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── layout/              # Header, Sidebar, Layout
│   │   │   ├── upload/              # Upload UI
│   │   │   ├── reports/             # Report views
│   │   │   ├── search/              # Search components
│   │   │   ├── query/               # Query interface
│   │   │   └── shared/              # Shared components
│   │   │
│   │   ├── pages/                    # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Upload.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── ReportDetailPage.tsx
│   │   │
│   │   ├── hooks/                    # React hooks
│   │   ├── services/                 # API services
│   │   │   └── api.ts               # Backend API client
│   │   ├── store/                    # State management
│   │   ├── types/                    # TypeScript types
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx                   # Main app component
│   │   └── main.tsx                  # Entry point
│   │
│   ├── package.json                  # Dependencies
│   ├── vite.config.ts               # Vite configuration
│   ├── tailwind.config.js           # Tailwind CSS config
│   └── tsconfig.json                # TypeScript config
│
└── README.md                         # This file
```

---

## 🎯 Features

### Backend
✅ **Excel Parsing** - Robust extraction of report metadata from .xlsx files
✅ **AI Enhancement** - Claude generates descriptions and validates data
✅ **MongoDB Storage** - Efficient storage with full-text search
✅ **RESTful API** - Clean, documented endpoints
✅ **Role Management** - Multi-environment access control (dev/sit/uat/prod)

### Frontend
✅ **Beautiful UI** - Modern dark theme with smooth animations
✅ **Drag & Drop Upload** - Intuitive file upload interface
✅ **Real-time Processing** - Live status updates during AI enhancement
✅ **Advanced Search** - Filter and search across all reports
✅ **Responsive Design** - Works on all screen sizes

---

## 📋 API Endpoints

### Upload
- `POST /api/upload` - Upload and process Excel file
- `POST /api/upload/batch` - Batch upload multiple files

### Reports
- `GET /api/reports` - List reports (paginated, searchable)
- `GET /api/reports/{id}` - Get report details
- `PUT /api/reports/{id}` - Update report
- `DELETE /api/reports/{id}` - Delete report
- `GET /api/reports/{id}/download` - Download JSON
- `GET /api/reports/types/list` - Get all report types

### Roles
- `GET /api/roles/{reportId}` - Get all roles
- `GET /api/roles/{reportId}/{env}` - Get role for environment
- `PUT /api/roles/{reportId}/{env}` - Update role
- `GET /api/roles/{reportId}/{env}/download` - Download role JSON

### Statistics
- `GET /api/stats` - Get database statistics
- `GET /api/stats/dashboard` - Dashboard-optimized stats

---

## 🔧 Configuration

### Backend (.env)
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=report_migration
MAX_FILE_SIZE_MB=10
CORS_ORIGINS=["http://localhost:3000"]
```

### MongoDB Collections
- `reports` - Report metadata
- `roles` - Role configurations

---

## 📊 Usage Example

### 1. Upload Report
```bash
# Via curl
curl -X POST http://localhost:8000/api/upload \
  -F "file=@report_migrations_200012.xlsx"

# Via UI
1. Go to http://localhost:3000
2. Click "Upload Reports"
3. Drag & drop your Excel file
4. Watch AI enhancement in real-time
```

### 2. Query Reports
```bash
# Search
curl "http://localhost:8000/api/reports?search=Client%20Metrics"

# Filter by type
curl "http://localhost:8000/api/reports?reportType=Financial"

# Pagination
curl "http://localhost:8000/api/reports?page=1&pageSize=20"
```

### 3. Download JSON
```bash
# Download report metadata
curl http://localhost:8000/api/reports/200012/download \
  -o 200012.json

# Download role configuration
curl http://localhost:8000/api/roles/200012/dev/download \
  -o roles-dev.json
```

---

## 🎨 UI Preview

The frontend features a sophisticated dark theme with:
- **Animated gradients** - Dynamic background effects
- **Smooth transitions** - Framer Motion animations
- **Data visualization** - Recharts for statistics
- **Responsive design** - Mobile-friendly layouts

Key Pages:
1. **Dashboard** - Overview with stats and recent activity
2. **Upload** - Drag & drop interface with progress tracking
3. **Reports Library** - Searchable, filterable report list
4. **Report Detail** - Complete metadata view with tabs
5. **Query Interface** - Natural language search (future: RAG)

---

## 🔍 Excel File Format

Your Excel files should have this structure:

```
Row 1:  reportName      | Client Metrics Queries
Row 2:  reportId        | 200012
Row 3:  formatSpecId    | 5d41402abc4b2a76b9719d911017c592
Row 4:  domainId        | e10adc3949ba59abbe56e057f20f883e
...

Row N:  Parameters
Row N+1: parameterName  | originalColumnName | parameterType
Row N+2: reportDate     | bill_date          | timestamp
Row N+3: accountId      | account_id         | varchar(64)
...

Row M:  Columns
Row M+1: columnName     | originalColumnName | columnDescription | dataType
Row M+2: Bill ID        | bill_id           | unique identifier | str
Row M+3: Bill Date      | bill_date         | transaction time  | datetime
...
```

---

## 🛠️ Development

### Backend Development
```bash
cd backend
venv\Scripts\activate

# Run with auto-reload
python -m uvicorn app.main:app --reload --port 8000

# Run tests (add pytest)
pytest

# Format code
black app/
isort app/
```

### Frontend Development
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Adding New Features

1. **New API Endpoint**: Add route in `backend/app/routes/`
2. **New UI Page**: Add component in `frontend/src/pages/`
3. **New Model**: Define in `backend/app/models/` and `frontend/src/types/`

---

## 🚢 Deployment

### Docker (Optional)
```dockerfile
# Backend Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]

# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
```

### Production Checklist
- [ ] Set secure MongoDB credentials
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up logging and monitoring
- [ ] Implement rate limiting
- [ ] Add authentication/authorization

---

## 🐛 Troubleshooting

**Backend won't start**
- Check MongoDB is running: `mongod --version`
- Verify ANTHROPIC_API_KEY in .env
- Check Python version: `python --version` (need 3.10+)

**Frontend won't start**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (need 18+)
- Verify backend is running on port 8000

**Upload fails**
- Check file size < 10MB
- Verify file is .xlsx format
- Check MongoDB connection
- Review backend logs for errors

**AI enhancement not working**
- Verify ANTHROPIC_API_KEY is valid
- Check API rate limits
- Review backend logs for Claude API errors

---

## 📝 License

MIT License - Feel free to use this project for your organization.

---

## 🙏 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API docs at `/api/docs`
3. Check backend logs for detailed errors

---

**Built with ❤️ using FastAPI, React, TailwindCSS, and Claude AI**
