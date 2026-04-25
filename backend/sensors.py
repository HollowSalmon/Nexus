import asyncio
import random
import time
from typing import AsyncIterator, Callable, Dict, Optional

from backend.datasets import DatasetProfile


class SensorSimulator:
    """Simulate sensor readings and evaluate status based on a loaded profile."""

    def __init__(self, profile_provider: Callable[[], Optional[DatasetProfile]]):
        self.profile_provider = profile_provider
        self.interval_seconds = 1.0
        self.random = random.Random(12345)

    async def read_stream(self) -> AsyncIterator[Dict[str, object]]:
        while True:
            yield self.generate_reading()
            await asyncio.sleep(self.interval_seconds)

    def generate_reading(self) -> Dict[str, object]:
        profile = self.profile_provider()
        temperature = round(22.0 + self.random.uniform(-5.0, 5.0), 1)
        turbidity = round(max(0.0, 3.0 + self.random.uniform(-1.5, 1.5)), 2)
        light = round(max(0.0, 180.0 + self.random.uniform(-90.0, 90.0)), 1)
        status = self.evaluate_status(temperature, turbidity, light, profile)
        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "temperature": temperature,
            "turbidity": turbidity,
            "light": light,
            "status": status,
        }

    def evaluate_status(
        self,
        temperature: float,
        turbidity: float,
        light: float,
        profile: Optional[DatasetProfile],
    ) -> Dict[str, str]:
        if not profile:
            return {
                "temperature": "normal",
                "turbidity": "normal",
                "light": "normal",
                "overall": "normal",
            }

        sensor_status = {
            "temperature": self._single_status(temperature, profile.temperature_min, profile.temperature_max),
            "turbidity": self._single_status(turbidity, profile.turbidity_min, profile.turbidity_max),
            "light": self._single_status(light, profile.light_min, profile.light_max),
        }
        sensor_status["overall"] = self._overall_status(sensor_status)
        return sensor_status

    def _single_status(self, value: float, min_value: float, max_value: float) -> str:
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
        if "critical" in statuses.values():
            return "critical"
        if "warning" in statuses.values():
            return "warning"
        return "normal"
