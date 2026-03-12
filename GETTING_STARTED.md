# 🚀 Getting Started with Report Migration System

## ⚡ Ultra-Quick Start (5 Minutes)

### Step 1: Install Dependencies (2 min)

```bash
# Navigate to your project
cd D:\development\PyCharmWorkSpace\report_migration_new

# Backend dependencies
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Frontend dependencies  
cd ..\frontend
npm install
```

### Step 2: Configure Environment (1 min)

```bash
# In backend folder, create .env file
cd backend
copy .env.example .env

# Edit .env and add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 3: Start MongoDB (if not running)

```bash
# Windows
mongod --dbpath D:\development\mongodb\7.0\db

# Or if MongoDB is a Windows service:
net start MongoDB
```

### Step 4: Run the Application (1 min)

**Option A: Use the startup script (Windows)**
```bash
# From project root
start.bat
```

**Option B: Manual start**
```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 5: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs

---

## 📝 First Upload Test

1. **Open the app**: http://localhost:3000

2. **Navigate to Upload page**

3. **Drag and drop** the sample Excel file:
   - File location: `D:\development\PyCharmWorkSpace\report_migration_new\originalMetadata\`
   - Use: `report migrations_200012.xlsx`

4. **Watch the magic happen**:
   - ✅ Excel parsing
   - ✅ AI enhancement (Claude generates descriptions)
   - ✅ MongoDB storage
   - ✅ Role creation

5. **View the result**:
   - Click "Browse Reports"
   - Find "Client Metrics Queries (#200012)"
   - Click to see full details

---

## 🎯 What You Can Do

### Upload Reports
- Drag & drop Excel files
- Automatic AI-powered enhancement
- Real-time processing status

### Manage Reports
- Search by name, type, or description
- Filter by report type
- View column details
- Edit metadata
- Download as JSON

### Manage Roles
- View role configurations per environment
- Update access permissions
- Download role JSON files

### Query (Coming Soon)
- Natural language queries
- RAG-powered search
- Smart suggestions

---

## 🔍 Testing with Sample Data

### Sample Excel File Location
```
report_migration_new/
└── originalMetadata/
    ├── 200012/
    │   ├── 200012.json (expected output)
    │   └── roles/
    └── prd_files/
        ├── report migrations_200012.xlsx  ← Use this!
        └── report migrations_200013.xlsx
```

### Expected Results After Upload

**Report Details:**
- Report ID: 200012
- Name: Client Metrics Queries
- Type: Client Metrics  
- Columns: 21
- Parameters: 2

**AI Enhancements:**
- Auto-generated report description
- Column descriptions for all 21 columns
- Data type validation

**MongoDB Storage:**
- Report saved in `reports` collection
- Roles saved in `roles` collection (4 environments)

---

## 🎨 UI Features to Explore

### Dashboard
- Total reports count
- Today's processing stats
- Recent activity timeline

### Upload Interface
- Drag & drop zone
- Progress indicators
- AI enhancement status
- Validation results

### Reports Library
- Searchable list
- Type filters
- Sort options
- Quick actions (View, Edit, Download)

### Report Detail View
- Complete metadata
- Column table
- Parameter list
- Role configurations

---

## 🐛 Common Issues & Solutions

### Issue: Backend won't start
**Error**: "No module named 'fastapi'"
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

### Issue: Frontend won't start  
**Error**: "Cannot find module"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue: MongoDB connection failed
**Error**: "Connection refused"
```bash
# Check if MongoDB is running
tasklist | findstr mongod

# If not running, start it:
mongod --dbpath C:\data\db
```

### Issue: AI enhancement not working
**Error**: "Invalid API key"
```bash
# Check your .env file in backend folder
# Make sure ANTHROPIC_API_KEY is set correctly
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### Issue: Upload fails
**Checklist**:
1. ✓ File is .xlsx format
2. ✓ File size < 10MB
3. ✓ Backend is running (check http://localhost:8000)
4. ✓ MongoDB is running
5. ✓ Check backend terminal for error logs

---

## 📊 MongoDB Verification

### Check Data in MongoDB

```bash
# Connect to MongoDB
mongosh

# Switch to database
use report_migration

# View reports
db.reports.find().pretty()

# Count reports
db.reports.countDocuments()

# View roles
db.roles.find().pretty()

# Search for specific report
db.reports.findOne({reportId: "200012"})
```

---

## 🎓 Next Steps

### 1. Customize the UI
- Edit colors in `frontend/tailwind.config.js`
- Modify components in `frontend/src/components/`
- Add your company branding

### 2. Add More Features
- Implement RAG query system
- Add user authentication
- Create export functionality
- Build analytics dashboard

### 3. Deploy to Production
- Set up Docker containers
- Configure NGINX
- Add SSL certificates
- Set up monitoring

---

## 📚 Learn More

### Backend (FastAPI)
- API Docs: http://localhost:8000/api/docs
- Code: `backend/app/`
- Models: `backend/app/models/`

### Frontend (React + TypeScript)
- Code: `frontend/src/`
- Components: `frontend/src/components/`
- API Client: `frontend/src/services/api.ts`

### LangChain Integration
- Processor: `backend/app/services/langchain_processor.py`
- Prompts: `backend/app/prompts/` (you can customize!)

---

## 💡 Tips & Tricks

1. **Fast Reload**: Both backend and frontend have hot-reload enabled

2. **Debug Mode**: Check browser console and backend terminal for logs

3. **API Testing**: Use the built-in Swagger UI at `/api/docs`

4. **MongoDB UI**: Install MongoDB Compass for a graphical interface

5. **Custom Prompts**: Edit prompts in `langchain_processor.py` to customize AI behavior

---

## ✅ Success Checklist

After following this guide, you should have:

- [x] Backend running on http://localhost:8000
- [x] Frontend running on http://localhost:3000
- [x] MongoDB connected and storing data
- [x] Successfully uploaded at least one Excel file
- [x] Viewed the AI-enhanced report details
- [x] Explored the beautiful UI

---

**Need Help?**
- Check README.md for detailed documentation
- Review API docs at /api/docs
- Check backend terminal for error messages
- Verify all services are running

**Ready to migrate your reports!** 🎉
