const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function fetchDatasets() {
  const response = await fetch(`${API_BASE}/api/datasets`);
  if (!response.ok) {
    throw new Error("Unable to fetch dataset list.");
  }
  return response.json();
}

export async function fetchSensorHistory() {
  const response = await fetch(`${API_BASE}/api/sensor-history`);
  if (!response.ok) {
    throw new Error("Unable to fetch sensor history.");
  }
  return response.json();
}

export async function createDataset(payload) {
  const response = await fetch(`${API_BASE}/api/datasets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || "Unable to create dataset.");
  }
  return response.json();
}
