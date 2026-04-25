@echo off
REM Setup script for Nexus Monitoring Prototype on Windows
REM This script:
REM 1. Creates a Python virtual environment
REM 2. Installs backend dependencies
REM 3. Installs frontend dependencies

echo.
echo ========================================
echo Nexus Monitoring Prototype - Setup
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.13+ and add it to your PATH.
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js and npm, then add them to your PATH.
    pause
    exit /b 1
)

echo Python version:
python --version
echo.
echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Create virtual environment
echo [1/4] Creating Python virtual environment...
if exist .venv (
    echo Virtual environment already exists at .venv
) else (
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo Virtual environment created.
)
echo.

REM Activate virtual environment and install backend dependencies
echo [2/4] Installing backend dependencies...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment.
    pause
    exit /b 1
)

pip install --upgrade pip
pip install -r backend/requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies.
    pause
    exit /b 1
)
echo Backend dependencies installed.
echo.

REM Install frontend dependencies
echo [3/4] Installing frontend dependencies...
cd frontend
npm install
if errorlevel 1 (
    echo ERROR: Failed to install npm dependencies.
    cd ..
    pause
    exit /b 1
)
echo Frontend dependencies installed.
cd ..
echo.

REM Summary
echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Start the backend in one terminal:
echo    .\.venv\Scripts\activate.bat
echo    uvicorn backend.app:app --reload --port 8000
echo.
echo 2. Start the frontend in another terminal:
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open your browser to http://localhost:5173
echo.
pause
