function generateSmoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x},${points[0].y}`;
  }

  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cpx = (p0.x + p1.x) / 2;
    const cpy = (p0.y + p1.y) / 2;
    path += ` Q ${cpx},${cpy} ${p1.x},${p1.y}`;
  }
  return path;
}

function SensorChart({label, value, unit, values, status}) {
  const chartId = label.replace(/\s+/g, "-").toLowerCase();
  const chartPoints = values.length
    ? values.map((entry, index) => {
        const step = values.length > 1 ? (index / (values.length - 1)) * 100 : 50;
        const min = Math.min(...values.map((item) => item.value));
        const max = Math.max(...values.map((item) => item.value));
        const normalized = max === min ? 0.5 : (entry.value - min) / (max - min);
        return { x: step, y: 100 - normalized * 70 - 10 };
      })
    : [];
  const smoothPath = generateSmoothPath(chartPoints);
  const fillPath = values.length > 1 ? `${smoothPath} L 100,100 L 0,100 Z` : "";

  return (
    <div className="sensor-card">
      <div className="sensor-card-title">
        <div>{label}</div>
        <div className={`sensor-status ${status}`}>{status || "unknown"}</div>
      </div>
      <div className="sensor-value">
        {value ?? "--"} <span>{unit}</span>
      </div>
      <div className="sensor-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${chartId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {fillPath && <path d={fillPath} fill={`url(#gradient-${chartId})`} />}
          {smoothPath && (
            <path
              d={smoothPath}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

function MonitorDashboard({latestReading, history, activeProfile, onActuatorCommand}) {
  const chartData = history.map((reading) => ({
    temperature: typeof reading.temperature === "number" ? reading.temperature : 0,
    turbidity: typeof reading.turbidity === "number" ? reading.turbidity : 0,
    light: typeof reading.light === "number" ? reading.light : 0,
  }));

  const temperaturePoints = chartData.map((item) => ({ value: item.temperature }));
  const turbidityPoints = chartData.map((item) => ({ value: item.turbidity }));
  const lightPoints = chartData.map((item) => ({ value: item.light }));

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <h2>Live Sensor Monitoring</h2>
          <p>Real-time environmental data with automatic updates every second.</p>
        </div>
        <div className="profile-summary">
          <strong>Active Profile:</strong>
          <div className="profile-name">{activeProfile?.speciesName ?? "None selected"}</div>
        </div>
      </div>

      <div className="chart-grid">
        <SensorChart
          label="Temperature"
          value={latestReading?.temperature}
          unit="°C"
          values={temperaturePoints}
          status={latestReading?.status?.temperature}
        />
        <SensorChart
          label="Turbidity"
          value={latestReading?.turbidity}
          unit="NTU"
          values={turbidityPoints}
          status={latestReading?.status?.turbidity}
        />
        <SensorChart
          label="Light Intensity"
          value={latestReading?.light}
          unit="lux"
          values={lightPoints}
          status={latestReading?.status?.light}
        />
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <span>Timestamp</span>
          <strong>{latestReading?.timestamp ?? "--"}</strong>
        </div>
        <div className="summary-card">
          <span>Overall Status</span>
          <strong className={`status-text ${latestReading?.status?.overall}`}>
            {latestReading?.status?.overall ?? "--"}
          </strong>
        </div>
      </div>

      <div className="guidelines-section">
        <h3>Operating Guidelines</h3>
        <p>{activeProfile?.guidelines ?? "Select a dataset profile to view guidelines."}</p>
      </div>

      <div className="actuators-section">
        <h3>System Controls</h3>
        <div className="actuators-grid">
          <button className="actuator-button" type="button" onClick={() => onActuatorCommand("temperature", "increase")}>Raise temperature</button>
          <button className="actuator-button" type="button" onClick={() => onActuatorCommand("temperature", "decrease")}>Lower temperature</button>
          <button className="actuator-button" type="button" onClick={() => onActuatorCommand("light", "adjust")}>Adjust light</button>
          <button className="actuator-button" type="button" onClick={() => onActuatorCommand("flow", "stabilize")}>Stabilize flow</button>
        </div>
      </div>
    </section>
  );
}

export default MonitorDashboard;
