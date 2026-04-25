# Frontend startup script for Nexus Monitoring Prototype on Windows PowerShell

Write-Host ""
Write-Host "========================================"
Write-Host "Nexus Monitoring Prototype - Frontend"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if frontend dependencies are installed
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "ERROR: node_modules not found in frontend directory." -ForegroundColor Red
    Write-Host "Please run setup.ps1 first to install frontend dependencies." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    Set-Location frontend
    Write-Host "Starting frontend development server..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The server will open on http://localhost:5173 in your browser." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the server."
    Write-Host ""

    npm run dev
} catch {
    Write-Host "ERROR: Failed to start frontend server." -ForegroundColor Red
    Write-Host "Details: $_" -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "Frontend stopped."
    Set-Location ..
    Read-Host "Press Enter to exit"
}
