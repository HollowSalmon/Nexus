import asyncio
import csv
import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from backend.datasets import DatasetManager, DatasetProfile
from backend.sensors import SensorSimulator

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
                "status_light",
                "status_overall",
            ])
            writer.writeheader()


def log_sensor_reading(reading: Dict[str, Any]) -> None:
    with SENSOR_LOG_PATH.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "timestamp",
            "temperature",
            "turbidity",
            "light",
            "status_temperature",
            "status_turbidity",
            "status_light",
            "status_overall",
        ])
        writer.writerow({
            "timestamp": reading["timestamp"],
            "temperature": reading["temperature"],
            "turbidity": reading["turbidity"],
            "light": reading["light"],
            "status_temperature": reading["status"]["temperature"],
            "status_turbidity": reading["status"]["turbidity"],
            "status_light": reading["status"]["light"],
            "status_overall": reading["status"]["overall"],
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

sensor_simulator = SensorSimulator(profile_provider=dataset_manager.get_active_profile)
connections: List[WebSocket] = []
connections_lock = asyncio.Lock()


class DatasetCreateRequest(BaseModel):
    species_name: str = Field(..., alias="speciesName")
    temperature_min: float = Field(..., alias="temperatureMin")
    temperature_max: float = Field(..., alias="temperatureMax")
    turbidity_min: float = Field(..., alias="turbidityMin")
    turbidity_max: float = Field(..., alias="turbidityMax")
    light_min: float = Field(..., alias="lightMin")
    light_max: float = Field(..., alias="lightMax")
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


async def sensor_loop() -> None:
    async for reading in sensor_simulator.read_stream():
        log_sensor_reading(reading)
        payload = {"type": "sensor_update", "data": reading}
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
        light_min=request.light_min,
        light_max=request.light_max,
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
                        "light": row["status_light"],
                        "overall": row["status_overall"],
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

    return CommandResponse(
        command=message.command,
        result="error",
        message="Unknown command.",
    )
