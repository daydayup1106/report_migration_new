@echo off
echo ====================================
echo   Report Migration System Starter
echo ====================================
echo.

REM Check if MongoDB is running
echo [1/4] Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ MongoDB is running
) else (
    echo ✗ MongoDB is not running!
    echo   Please start MongoDB first:
    echo   mongod --dbpath C:\data\db
    echo.
    pause
    exit /b 1
)

echo.
echo [2/4] Starting Backend API...
cd backend
start "Backend API" cmd /k "conda activate report_migration_new && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 9000"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Starting Frontend...
cd ..\frontend
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo [4/4] Opening browser...
timeout /t 5 /nobreak >nul
start http://localhost:4000

echo.
echo ====================================
echo   Application Started Successfully!
echo ====================================
echo.
echo Frontend: http://localhost:4000
echo Backend:  http://localhost:9000
echo API Docs: http://localhost:9000/api/docs
echo.
echo Press any key to exit this window...
echo (Keep the Backend and Frontend windows open)
pause >nul
