import { useEffect, useRef, useState } from "react";
import MonitorDashboard from "./components/MonitorDashboard.jsx";
import DatasetManager from "./components/DatasetManager.jsx";
import Analytics from "./components/Analytics.jsx";
import { fetchDatasets, createDataset, fetchSensorHistory } from "./services/api.js";
import { createWebSocketClient } from "./services/wsClient.js";

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8000/ws`;

function App() {
  const [activeTab, setActiveTab] = useState("monitor");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [statusMessage, setStatusMessage] = useState("Connecting to backend...");
  const [sensorHistory, setSensorHistory] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const wsClient = useRef(null);

  useEffect(() => {
    loadDatasets();
    loadSensorHistory();
    wsClient.current = createWebSocketClient(WS_URL, {
      onOpen: () => {
        setConnectionStatus("connected");
        setStatusMessage("Connected to backend.");
      },
      onClose: () => {
        setConnectionStatus("disconnected");
        setStatusMessage("Disconnected. Reconnecting...");
      },
      onError: () => {
        setStatusMessage("WebSocket connection error.");
      },
      onMessage: handleWsMessage,
    });
    wsClient.current.connect();
    return () => {
      wsClient.current?.disconnect();
    };
  }, []);

  async function loadDatasets() {
    try {
      const list = await fetchDatasets();
      setDatasets(list);
    } catch (error) {
      console.error(error);
      setStatusMessage("Failed to load dataset list.");
    }
  }

  async function loadSensorHistory() {
    try {
      const stored = window.localStorage.getItem("nexus-sensor-history");
      if (stored) {
        setSensorHistory(JSON.parse(stored));
      }
      const history = await fetchSensorHistory();
      setSensorHistory(history.slice(-200));
      window.localStorage.setItem("nexus-sensor-history", JSON.stringify(history.slice(-200)));
    } catch (error) {
      console.warn("History load failed:", error);
    }
  }

  function handleWsMessage(rawData) {
    try {
      const message = typeof rawData === "string" ? JSON.parse(rawData) : JSON.parse(rawData.data);
      if (message.type === "sensor_update") {
        setLatestReading(message.data);
        setSensorHistory((current) => {
          const next = [...current, message.data].slice(-200);
          window.localStorage.setItem("nexus-sensor-history", JSON.stringify(next));
          return next;
        });
      }
      if (message.type === "connection_open") {
        if (message.activeProfile) {
          setActiveProfile(message.activeProfile);
        }
      }
      if (message.type === "command_response") {
        setStatusMessage(message.message || "Command response received.");
        if (message.command === "load_profile" && message.result === "ok") {
          setActiveProfile(message.payload?.activeProfile ?? activeProfile);
        }
      }
    } catch (error) {
      console.error("WebSocket message parse error:", error);
    }
  }

  async function handleCreateProfile(profile) {
    try {
      await createDataset(profile);
      await loadDatasets();
      setStatusMessage(`Profile '${profile.speciesName}' added.`);
    } catch (error) {
      console.error(error);
      setStatusMessage("Failed to add profile.");
    }
  }

  function handleLoadProfile(name) {
    if (!wsClient.current) {
      setStatusMessage("Websocket is not initialized.");
      return;
    }
    wsClient.current.send({
      type: "command",
      command: "load_profile",
      payload: { name },
    });
    setStatusMessage(`Requesting profile load: ${name}`);
  }

  function handleActuatorCommand(actuator, action) {
    if (!wsClient.current) {
      setStatusMessage("Websocket is not initialized.");
      return;
    }
    wsClient.current.send({
      type: "command",
      command: "actuator_control",
      payload: { actuator, action },
    });
    setStatusMessage(`Sent ${action} to ${actuator}.`);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>The Nexus</h1>
          <p>Minimal live monitoring, control, and historical sensor history.</p>
        </div>
        <div className="connection-status">
          <span className={`status-badge ${connectionStatus}`}>{connectionStatus}</span>
          <div>{statusMessage}</div>
        </div>
      </header>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === "monitor" ? "active" : ""}`}
          onClick={() => setActiveTab("monitor")}
        >
          Live Monitor
        </button>
        <button
          className={`tab-button ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
        <button
          className={`tab-button ${activeTab === "datasets" ? "active" : ""}`}
          onClick={() => setActiveTab("datasets")}
        >
          Datasets
        </button>
      </div>

      <main className="tab-content">
        {activeTab === "monitor" && (
          <MonitorDashboard
            latestReading={latestReading}
            history={sensorHistory}
            activeProfile={activeProfile}
            onActuatorCommand={handleActuatorCommand}
          />
        )}

        {activeTab === "history" && (
          <Analytics history={sensorHistory} />
        )}

        {activeTab === "datasets" && (
          <DatasetManager
            datasets={datasets}
            activeProfile={activeProfile}
            onLoadProfile={handleLoadProfile}
            onCreateProfile={handleCreateProfile}
          />
        )}
      </main>
    </div>
  );
}

export default App;
