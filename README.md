# Nexus Monitoring & Control Prototype

A simple full-stack monitoring prototype with Python 3.13-compatible backend and React + Vite frontend.

## Features
- FastAPI backend with WebSocket live sensor streaming
- Simulated light, turbidity, and temperature sensors
- Dataset profile storage in CSV format
- REST endpoints for dataset listing and profile creation
- React dashboard with live charts, status cards, and controls
- Automatic WebSocket reconnect handling

## Quick Setup (Automated)

### Windows (CMD)
```cmd
setup.bat
```

### Windows (PowerShell)
```powershell
.\setup.ps1
```

The setup script will:
1. Create a Python virtual environment
2. Install backend dependencies
3. Install frontend dependencies

After setup completes, follow the "Running the Application" section below.

## Manual Setup;lpo0p;po908

### Backend Setup
1. Open Command Prompt or PowerShell in the repository root.
2. Create and activate a Python 3.13.12 virtual environment:
   - **Command Prompt:**
     ```cmd
     python -m venv .venv
     .venv\Scripts\activate.bat
     ```
   - **PowerShell:**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
3. Install dependencies:
   ```cmd
   pip install -r backend/requirements.txt
   ```

### Frontend Setup
1. Open a second Command Prompt or PowerShell in the repository root.
2. Change into the frontend folder:
   ```cmd
   cd frontend
   ```
3. Install npm dependencies:
   ```cmd
   npm install
   ```

## Running the Application

### Start Backend

#### Command Prompt
```cmd
start_backend.bat
```

#### PowerShell
```powershell
.\start_backend.ps1
```

The backend will start on `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### Start Frontend

#### Command Prompt
```cmd
start_frontend.bat
```

#### PowerShell
```powershell
.\start_frontend.ps1
```

The frontend will start on `http://localhost:5173`. Open this URL in your browser.

## How it works
- Backend simulates sensor readings every second and broadcasts them over WebSocket.
- Frontend receives live updates, renders charts, and shows sensor status.
- Dataset profiles are stored in `backend/data/sample_profiles.csv`.
- Use the dataset manager to load profiles and add new profile records.
- The frontend sends profile load commands over WebSocket and dataset creation requests over REST.

## Notes
- The prototype is intentionally minimal and modular.
- CSV storage is used for dataset profiles to keep the backend dependency footprint small.
- The current implementation is ready for future replacement of the sensor simulator with real hardware input.
