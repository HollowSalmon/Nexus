import asyncio
import re
import serial
import time
from typing import AsyncIterator, Callable, Dict, Optional

from backend.datasets import DatasetProfile


class SerialSensorReader:
    """Read sensor data from Arduino via serial connection."""

    def __init__(
        self,
        profile_provider: Callable[[], Optional[DatasetProfile]],
        port: str = "COM5",
        baudrate: int = 9600,
        timeout: float = 2.0,
    ):
        self.profile_provider = profile_provider
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial_connection: Optional[serial.Serial] = None
        self.buffer = ""

    def _connect(self) -> None:
        """Establish serial connection to Arduino."""
        if self.serial_connection is None or not self.serial_connection.is_open:
            try:
                self.serial_connection = serial.Serial(
                    self.port, self.baudrate, timeout=self.timeout
                )
                time.sleep(2)  # Wait for Arduino to initialize
            except serial.SerialException as e:
                print(f"Failed to connect to Arduino on {self.port}: {e}")
                self.serial_connection = None

    def _disconnect(self) -> None:
        """Close serial connection."""
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()

    async def read_stream(self) -> AsyncIterator[Dict[str, object]]:
        """Stream sensor readings from Arduino."""
        self._connect()
        if self.serial_connection is None:
            # Fallback: generate dummy readings if no Arduino connected
            print("No Arduino connected, using dummy sensor data")
            while True:
                yield self._generate_dummy_reading()
                await asyncio.sleep(1.0)
            return
            
        try:
            while True:
                reading = await self._read_single()
                if reading:
                    yield reading
                await asyncio.sleep(0.1)
        finally:
            self._disconnect()

    def _generate_dummy_reading(self) -> Dict[str, object]:
        """Generate dummy sensor reading for testing without Arduino."""
        import random
        profile = self.profile_provider()
        temperature = round(22.0 + random.uniform(-2.0, 2.0), 1)
        turbidity = round(max(0.0, 3.0 + random.uniform(-1.0, 1.0)), 2)
        light = random.choice([0.0, 1.0])  # Random light state
        
        status = self.evaluate_status(temperature, turbidity, profile)
        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "temperature": temperature,
            "turbidity": turbidity,
            "light": light,
            "status": status,
        }

    async def _read_single(self) -> Optional[Dict[str, object]]:
        """Read and parse a single sensor reading from Arduino."""
        try:
            if self.serial_connection and self.serial_connection.in_waiting:
                chunk = self.serial_connection.read(self.serial_connection.in_waiting).decode('utf-8', errors='ignore')
                self.buffer += chunk

                # Check for complete reading block (ends with "------------------------")
                if "------------------------" in self.buffer:
                    # Extract the complete block
                    block_end = self.buffer.find("------------------------") + len("------------------------")
                    block = self.buffer[:block_end]
                    self.buffer = self.buffer[block_end:]

                    # Parse and return
                    return self._parse_reading(block)
        except Exception as e:
            print(f"Error reading from serial: {e}")
        return None

    def _parse_reading(self, block: str) -> Optional[Dict[str, object]]:
        """
        Parse a complete sensor reading block from Arduino output.

        Expected format:
        --- Environment Data ---
        Temperature: 22.5 °C
        Light: Detected
        Turbidity: 3.45 NTU
        ------------------------
        """
        try:
            # Extract temperature
            temp_match = re.search(r'Temperature:\s*([\d.-]+)\s*°C', block)
            if not temp_match:
                return None
            temperature = float(temp_match.group(1))

            # Extract light status (Detected = 1.0, None = 0.0)
            light_match = re.search(r'Light:\s*(Detected|None)', block)
            if not light_match:
                return None
            light = 1.0 if light_match.group(1) == "Detected" else 0.0

            # Extract turbidity
            turbidity_match = re.search(r'Turbidity:\s*([\d.-]+)\s*NTU', block)
            if not turbidity_match:
                return None
            turbidity = float(turbidity_match.group(1))

            # Check for error condition
            if "ERR" in block:
                return None

            profile = self.profile_provider()
            status = self.evaluate_status(temperature, turbidity, profile)
            return {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "temperature": temperature,
                "turbidity": turbidity,
                "light": light,
                "status": status,
            }
        except (ValueError, AttributeError):
            return None

    def evaluate_status(
        self,
        temperature: float,
        turbidity: float,
        profile: Optional[DatasetProfile],
    ) -> Dict[str, str]:
        """Evaluate sensor status based on profile (temperature and turbidity only)."""
        if not profile:
            return {
                "temperature": "normal",
                "turbidity": "normal",
                "overall": "normal",
            }

        sensor_status = {
            "temperature": self._single_status(temperature, profile.temperature_min, profile.temperature_max),
            "turbidity": self._single_status(turbidity, profile.turbidity_min, profile.turbidity_max),
        }
        sensor_status["overall"] = self._overall_status(sensor_status)
        return sensor_status

    def _single_status(self, value: float, min_value: float, max_value: float) -> str:
        """Determine status of a single sensor value."""
        if min_value <= value <= max_value:
            return "normal"
        if value < min_value:
            delta = min_value - value
        else:
            delta = value - max_value
        if delta <= max(1.0, abs(max_value - min_value) * 0.15):
            return "warning"
        return "critical"

    def _overall_status(self, statuses: Dict[str, str]) -> str:
        """Determine overall status from individual sensor statuses."""
        if "critical" in statuses.values():
            return "critical"
        if "warning" in statuses.values():
            return "warning"
        return "normal"
