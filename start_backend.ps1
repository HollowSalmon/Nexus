# Backend startup script for Nexus Monitoring Prototype on Windows PowerShell

Write-Host ""
Write-Host "========================================"
Write-Host "Nexus Monitoring Prototype - Backend"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "ERROR: Virtual environment not found at .venv" -ForegroundColor Red
    Write-Host "Please run setup.ps1 first to create the virtual environment." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
try {
    . .\.venv\Scripts\Activate.ps1
} catch {
    Write-Host "ERROR: Failed to activate virtual environment." -ForegroundColor Red
    Write-Host "Details: $_" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Virtual environment activated."
Write-Host ""
Write-Host "Starting backend server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "API docs available at http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server."
Write-Host ""

# Start the backend
uvicorn backend.app:app --reload --port 8000

Write-Host ""
Write-Host "Backend stopped."
Read-Host "Press Enter to exit"
