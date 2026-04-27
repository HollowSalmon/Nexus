import asyncio
import csv
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from backend.datasets import DatasetManager, DatasetProfile
from backend.sensors import SerialSensorReader

DATA_DIR = Path(__file__).parent / "data"
SENSOR_LOG_PATH = DATA_DIR / "sensor_log.csv"


def ensure_sensor_log_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not SENSOR_LOG_PATH.exists() or SENSOR_LOG_PATH.stat().st_size == 0:
        with SENSOR_LOG_PATH.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=[
                "timestamp",
                "temperature",
                "turbidity",
                "light",
                "status_temperature",
                "status_turbidity",
                "status_overall",
                "actuator_cooler",
                "actuator_filter",
                "actuator_light",
            ])
            writer.writeheader()
    else:
        # Check if file has header
        with SENSOR_LOG_PATH.open("r", encoding="utf-8") as handle:
            first_line = handle.readline().strip()
            if not first_line.startswith("timestamp"):
                # File exists but no header, recreate it
                temp_data = []
                handle.seek(0)
                reader = csv.reader(handle)
                for row in reader:
                    if len(row) == 10:  # Assume data rows have 10 columns
                        temp_data.append(row)
                
                with SENSOR_LOG_PATH.open("w", newline="", encoding="utf-8") as write_handle:
                    writer = csv.DictWriter(write_handle, fieldnames=[
                        "timestamp",
                        "temperature",
                        "turbidity",
                        "light",
                        "status_temperature",
                        "status_turbidity",
                        "status_overall",
                        "actuator_cooler",
                        "actuator_filter",
                        "actuator_light",
                    ])
                    writer.writeheader()
                    for row in temp_data:
                        writer.writerow({
                            "timestamp": row[0],
                            "temperature": row[1],
                            "turbidity": row[2],
                            "light": row[3],
                            "status_temperature": row[4],
                            "status_turbidity": row[5],
                            "status_overall": row[6],
                            "actuator_cooler": row[7],
                            "actuator_filter": row[8],
                            "actuator_light": row[9],
                        })


def log_sensor_reading(reading: Dict[str, Any]) -> None:
    with SENSOR_LOG_PATH.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "timestamp",
            "temperature",
            "turbidity",
            "light",
            "status_temperature",
            "status_turbidity",
            "status_overall",
            "actuator_cooler",
            "actuator_filter",
            "actuator_light",
        ])
        writer.writerow({
            "timestamp": reading["timestamp"],
            "temperature": reading["temperature"],
            "turbidity": reading["turbidity"],
            "light": reading["light"],
            "status_temperature": reading["status"]["temperature"],
            "status_turbidity": reading["status"]["turbidity"],
            "status_overall": reading["status"]["overall"],
            "actuator_cooler": "on" if actuator_state["cooler_active"] else "off",
            "actuator_filter": "on" if actuator_state["filter_active"] else "off",
            "actuator_light": "on" if actuator_state["light_active"] else "off",
        })

app = FastAPI(title="Nexus Monitoring & Control Prototype", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

dataset_manager = DatasetManager()
dataset_manager.ensure_csv_file()
ensure_sensor_log_file()

sensor_simulator = SerialSensorReader(profile_provider=dataset_manager.get_active_profile)
connections: List[WebSocket] = []
connections_lock = asyncio.Lock()

# ========== ACTUATOR STATE MANAGEMENT ==========
actuator_state = {
    "cooler_active": False,
    "filter_active": False,
    "light_active": False,
    "cooler_last_toggle": 0.0,
    "filter_last_toggle": 0.0,
    "light_last_toggle": 0.0,
    "daily_light_seconds": 0.0,
    "last_midnight": None,
}
actuator_state_lock = asyncio.Lock()
MIN_CYCLE_TIME = 300  # seconds between actuator toggles


class DatasetCreateRequest(BaseModel):
    species_name: str = Field(..., alias="speciesName")
    temperature_min: float = Field(..., alias="temperatureMin")
    temperature_max: float = Field(..., alias="temperatureMax")
    turbidity_min: float = Field(..., alias="turbidityMin")
    turbidity_max: float = Field(..., alias="turbidityMax")
    time_in_light: float = Field(..., alias="timeInLight")
    guidelines: str

    class Config:
        allow_population_by_field_name = True


class CommandMessage(BaseModel):
    type: str
    command: str
    payload: Dict[str, Any] = {}


class CommandResponse(BaseModel):
    type: str = "command_response"
    command: str
    result: str
    message: str
    payload: Dict[str, Any] = {}


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(sensor_loop())


# ========== ACTUATOR CONTROL FUNCTIONS ==========
def reset_daily_light_if_needed():
    """Reset daily light tracking at UTC midnight."""
    global actuator_state
    now = datetime.utcnow()
    today = now.date()
    if actuator_state["last_midnight"] != today:
        actuator_state["daily_light_seconds"] = 0.0
        actuator_state["last_midnight"] = today


def evaluate_actuators(reading: Dict[str, Any], profile):
    """Evaluate which actuators should be on/off based on sensor readings."""
    if not profile:
        return {"cooler_on": False, "filter_on": False, "light_on": False}
    
    temperature = reading.get("temperature", 22.0)
    turbidity = reading.get("turbidity", 3.0)
    light = reading.get("light", 0.0)
    
    new_states = {}
    
    # Cooler: activate if temp > max
    if temperature > profile.temperature_max:
        new_states["cooler_on"] = True
    elif temperature < (profile.temperature_min + profile.temperature_max) / 2:
        new_states["cooler_on"] = False
    else:
        new_states["cooler_on"] = actuator_state["cooler_active"]
    
    # Filter: activate if turbidity > max
    if turbidity > profile.turbidity_max:
        new_states["filter_on"] = True
    elif turbidity < (profile.turbidity_min + profile.turbidity_max) / 2:
        new_states["filter_on"] = False
    else:
        new_states["filter_on"] = actuator_state["filter_active"]
    
    # Light: activate if no light detected and within daily limit
    time_in_light_hours = getattr(profile, "time_in_light", 12.0)
    if light == 0.0 and actuator_state["daily_light_seconds"] < (time_in_light_hours * 3600):
        new_states["light_on"] = True
    else:
        new_states["light_on"] = False
    
    return new_states


def apply_actuator_commands(new_states: Dict[str, bool], current_time: float):
    """Apply new actuator commands with cycle prevention."""
    global actuator_state
    changes = False
    
    mapping = {
        "cooler_on": "cooler_active",
        "filter_on": "filter_active", 
        "light_on": "light_active"
    }
    
    for actuator, desired_state in new_states.items():
        key_active = mapping[actuator]
        key_toggle = f"{key_active.replace('_active', '_last_toggle')}"
        
        if desired_state != actuator_state[key_active]:
            if current_time - actuator_state[key_toggle] >= MIN_CYCLE_TIME:
                actuator_state[key_active] = desired_state
                actuator_state[key_toggle] = current_time
                changes = True
                # Send serial command
                send_serial_command(actuator.replace("_on", ""), desired_state)
    
    return changes


def send_serial_command(actuator: str, state: bool):
    """Send control command to Arduino via serial."""
    command_map = {
        "cooler": "C" if state else "c",
        "filter": "F" if state else "f", 
        "light": "L" if state else "l"
    }
    command = command_map.get(actuator)
    if command and sensor_simulator.serial_connection:
        try:
            sensor_simulator.serial_connection.write(command.encode())
        except Exception as e:
            print(f"Failed to send serial command: {e}")


async def sensor_loop() -> None:
    async for reading in sensor_simulator.read_stream():
        current_time = time.time()
        profile = dataset_manager.get_active_profile()
        
        # Reset daily light if needed
        reset_daily_light_if_needed()
        
        # Evaluate actuator states
        new_states = evaluate_actuators(reading, profile)
        
        # Apply actuator commands with cycle prevention
        changes = apply_actuator_commands(new_states, current_time)
        
        # Track light usage
        if actuator_state["light_active"]:
            actuator_state["daily_light_seconds"] += 1  # 1 second increment
        
        # Log sensor reading with actuator states
        log_sensor_reading(reading)
        
        # Broadcast updates
        payload = {
            "type": "sensor_update", 
            "data": reading,
            "actuators": {
                "cooler_active": actuator_state["cooler_active"],
                "filter_active": actuator_state["filter_active"],
                "light_active": actuator_state["light_active"],
                "daily_light_hours": round(actuator_state["daily_light_seconds"] / 3600, 2),
            }
        }
        text = json.dumps(payload)
        async with connections_lock:
            for websocket in list(connections):
                try:
                    await websocket.send_text(text)
                except Exception:
                    connections.remove(websocket)


@app.get("/api/datasets")
def list_datasets() -> List[Dict[str, Any]]:
    return [profile.dict(by_alias=True) for profile in dataset_manager.list_profiles()]


@app.post("/api/datasets")
def create_dataset(request: DatasetCreateRequest) -> Dict[str, Any]:
    profile = DatasetProfile(
        species_name=request.species_name,
        temperature_min=request.temperature_min,
        temperature_max=request.temperature_max,
        turbidity_min=request.turbidity_min,
        turbidity_max=request.turbidity_max,
        time_in_light=request.time_in_light,
        guidelines=request.guidelines,
    )
    try:
        dataset_manager.add_profile(profile)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"status": "ok", "profile": profile.dict(by_alias=True)}


@app.get("/api/datasets/active")
def get_active_dataset() -> Dict[str, Any]:
    profile = dataset_manager.get_active_profile()
    if not profile:
        raise HTTPException(status_code=404, detail="No active profile set")
    return profile.dict(by_alias=True)


@app.post("/api/datasets/load")
def load_dataset(name: str) -> Dict[str, Any]:
    try:
        dataset_manager.set_active_profile(name)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    profile = dataset_manager.get_active_profile()
    return {"status": "ok", "active": profile.dict(by_alias=True)}


@app.get("/api/sensor-history")
def get_sensor_history(limit: int = 200) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    if not SENSOR_LOG_PATH.exists():
        return rows
    with SENSOR_LOG_PATH.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            try:
                rows.append({
                    "timestamp": row["timestamp"],
                    "temperature": float(row["temperature"]),
                    "turbidity": float(row["turbidity"]),
                    "light": float(row["light"]),
                    "status": {
                        "temperature": row["status_temperature"],
                        "turbidity": row["status_turbidity"],
                        "overall": row["status_overall"],
                    },
                    "actuators": {
                        "cooler": row.get("actuator_cooler", "off"),
                        "filter": row.get("actuator_filter", "off"),
                        "light": row.get("actuator_light", "off"),
                    },
                })
            except Exception:
                continue
    return rows[-limit:]


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    async with connections_lock:
        connections.append(websocket)

    try:
        init_profile = dataset_manager.get_active_profile()
        init_payload = {
            "type": "connection_open",
            "activeProfile": init_profile.dict(by_alias=True) if init_profile else None,
        }
        await websocket.send_text(json.dumps(init_payload))

        while True:
            raw_message = await websocket.receive_text()
            try:
                message = CommandMessage.parse_raw(raw_message)
            except ValidationError as exc:
                await websocket.send_text(
                    CommandResponse(
                        command="invalid",
                        result="error",
                        message="Invalid command payload",
                        payload={"errors": exc.errors()},
                    ).json()
                )
                continue

            response = await handle_command(message)
            await websocket.send_text(response.json())
    except WebSocketDisconnect:
        pass
    finally:
        async with connections_lock:
            if websocket in connections:
                connections.remove(websocket)


async def handle_command(message: CommandMessage) -> CommandResponse:
    if message.command == "load_profile":
        name = message.payload.get("name")
        if not name:
            return CommandResponse(
                command=message.command,
                result="error",
                message="Missing profile name.",
            )
        try:
            dataset_manager.set_active_profile(name)
        except ValueError as exc:
            return CommandResponse(
                command=message.command,
                result="error",
                message=str(exc),
            )
        profile = dataset_manager.get_active_profile()
        return CommandResponse(
            command=message.command,
            result="ok",
            message=f"Active profile set to {name}.",
            payload={"activeProfile": profile.dict(by_alias=True) if profile else {}},
        )

    if message.command == "current_status":
        profile = dataset_manager.get_active_profile()
        return CommandResponse(
            command=message.command,
            result="ok",
            message="Current profile status.",
            payload={"activeProfile": profile.dict(by_alias=True) if profile else None},
        )

    if message.command == "actuator_control":
        actuator = message.payload.get("actuator")
        action = message.payload.get("action")
        if not actuator or not action:
            return CommandResponse(
                command=message.command,
                result="error",
                message="Missing actuator or action.",
            )
        return CommandResponse(
            command=message.command,
            result="ok",
            message=f"Actuator {actuator} command '{action}' received.",
            payload={"actuator": actuator, "action": action},
        )

    if message.command == "manual_actuator_command":
        actuator = message.payload.get("actuator")
        action = message.payload.get("action")
        if not actuator or not action:
            return CommandResponse(
                command=message.command,
                result="error",
                message="Missing actuator or action.",
            )
        if actuator not in ["cooler", "filter", "light"]:
            return CommandResponse(
                command=message.command,
                result="error",
                message="Invalid actuator. Must be 'cooler', 'filter', or 'light'.",
            )
        if action not in ["on", "off"]:
            return CommandResponse(
                command=message.command,
                result="error",
                message="Invalid action. Must be 'on' or 'off'.",
            )
        
        # Manual override - bypass cycle timer
        state = action == "on"
        actuator_state[f"{actuator}_active"] = state
        actuator_state[f"{actuator}_last_toggle"] = time.time()
        send_serial_command(actuator, state)
        
        return CommandResponse(
            command=message.command,
            result="ok",
            message=f"Actuator {actuator} set to {action} (manual override).",
            payload={"actuator": actuator, "action": action, "manual": True},
        )

    return CommandResponse(
        command=message.command,
        result="error",
        message="Unknown command.",
    )
