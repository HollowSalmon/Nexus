# Setup script for Nexus Monitoring Prototype on Windows PowerShell
# This script:
# 1. Creates a Python virtual environment
# 2. Installs backend dependencies
# 3. Installs frontend dependencies

Write-Host ""
Write-Host "========================================"
Write-Host "Nexus Monitoring Prototype - Setup"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python version: $pythonVersion"
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.13+ and add it to your PATH."
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    Write-Host "Node.js version: $nodeVersion"
    Write-Host "npm version: $npmVersion"
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js and npm, then add them to your PATH."
    exit 1
}

Write-Host ""

# Create virtual environment
Write-Host "[1/4] Creating Python virtual environment..." -ForegroundColor Cyan
if (Test-Path ".venv") {
    Write-Host "Virtual environment already exists at .venv"
} else {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create virtual environment." -ForegroundColor Red
        exit 1
    }
    Write-Host "Virtual environment created."
}
Write-Host ""

# Activate virtual environment and install backend dependencies
Write-Host "[2/4] Installing backend dependencies..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to activate virtual environment." -ForegroundColor Red
    exit 1
}

python -m pip install --upgrade pip
pip install -r backend/requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install backend dependencies." -ForegroundColor Red
    exit 1
}
Write-Host "Backend dependencies installed."
Write-Host ""

# Install frontend dependencies
Write-Host "[3/4] Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install npm dependencies." -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "Frontend dependencies installed."
Set-Location ..
Write-Host ""

# Summary
Write-Host ""
Write-Host "========================================"
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "1. Start the backend in one terminal:"
Write-Host "   .\.venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "   uvicorn backend.app:app --reload --port 8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Start the frontend in another terminal:"
Write-Host "   cd frontend" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Open your browser to http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
