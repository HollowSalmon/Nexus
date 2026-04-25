import csv
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field


class DatasetProfile(BaseModel):
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


class DatasetManager:
    """Manage profile datasets stored in CSV files."""

    HEADER = [
        "speciesName",
        "temperatureMin",
        "temperatureMax",
        "turbidityMin",
        "turbidityMax",
        "lightMin",
        "lightMax",
        "guidelines",
    ]

    def __init__(self, data_dir: Optional[Path] = None, filename: str = "sample_profiles.csv"):
        self.data_dir = Path(data_dir or Path(__file__).parent / "data")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.csv_path = self.data_dir / filename
        self.active_profile_name: Optional[str] = None

    def ensure_csv_file(self) -> None:
        if not self.csv_path.exists():
            self._write_sample_profiles()
        if self.csv_path.stat().st_size == 0:
            self._write_sample_profiles()
        if not self.active_profile_name:
            profiles = self.list_profiles()
            if profiles:
                self.active_profile_name = profiles[0].species_name

    def _write_sample_profiles(self) -> None:
        sample_rows = [
            {
                "speciesName": "Freshwater Minnow",
                "temperatureMin": "18.0",
                "temperatureMax": "24.0",
                "turbidityMin": "1.0",
                "turbidityMax": "4.0",
                "lightMin": "120.0",
                "lightMax": "250.0",
                "guidelines": "Keep water cool and clear. Avoid bright direct light.",
            },
            {
                "speciesName": "Tropical Shrimp",
                "temperatureMin": "24.0",
                "temperatureMax": "28.0",
                "turbidityMin": "2.0",
                "turbidityMax": "6.0",
                "lightMin": "80.0",
                "lightMax": "140.0",
                "guidelines": "Maintain warm water and moderate light. Keep current steady.",
            },
        ]
        with self.csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=self.HEADER)
            writer.writeheader()
            writer.writerows(sample_rows)

    def list_profiles(self) -> List[DatasetProfile]:
        profiles: List[DatasetProfile] = []
        if not self.csv_path.exists():
            return profiles
        with self.csv_path.open("r", newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                if not row.get("speciesName"):
                    continue
                profiles.append(DatasetProfile(**row))
        return profiles

    def add_profile(self, profile: DatasetProfile) -> None:
        existing = [p.species_name for p in self.list_profiles()]
        if profile.species_name in existing:
            raise ValueError(f"Profile '{profile.species_name}' already exists.")
        with self.csv_path.open("a", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=self.HEADER)
            writer.writerow(profile.dict(by_alias=True))

    def get_profile(self, name: str) -> Optional[DatasetProfile]:
        for profile in self.list_profiles():
            if profile.species_name == name:
                return profile
        return None

    def set_active_profile(self, name: str) -> None:
        profile = self.get_profile(name)
        if not profile:
            raise ValueError(f"Profile '{name}' not found.")
        self.active_profile_name = profile.species_name

    def get_active_profile(self) -> Optional[DatasetProfile]:
        if self.active_profile_name:
            return self.get_profile(self.active_profile_name)
        profiles = self.list_profiles()
        return profiles[0] if profiles else None
