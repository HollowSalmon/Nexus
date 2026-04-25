@echo off
REM Frontend startup script for Nexus Monitoring Prototype on Windows

echo.
echo ========================================
echo Nexus Monitoring Prototype - Frontend
echo ========================================
echo.

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo ERROR: node_modules not found in frontend directory.
    echo.
    echo Please run setup.bat first to install frontend dependencies.
    echo.
    pause
    exit /b 1
)

cd frontend

echo Starting frontend development server...
echo.
echo The server will open on http://localhost:5173 in your browser.
echo Press Ctrl+C to stop the server.
echo.

npm run dev

echo.
echo Frontend stopped.
cd ..
pause
