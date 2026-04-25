@echo off
REM Backend startup script for Nexus Monitoring Prototype on Windows

echo.
echo ========================================
echo Nexus Monitoring Prototype - Backend
echo ========================================
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at .venv
    echo.
    echo Please run setup.bat first to create the virtual environment.
    echo.
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment.
    echo.
    pause
    exit /b 1
)

echo Virtual environment activated.
echo.
echo Starting backend server on http://localhost:8000
echo API docs available at http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server.
echo.

REM Start the backend
uvicorn backend.app:app --reload --port 8000

echo.
echo Backend stopped.
pause
