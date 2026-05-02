import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function SensorChart({label, value, unit, data, status, color, fillColor}) {
  const chartData = {
    labels: data.map((_, index) => index + 1),
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: fillColor,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        padding: 10,
        borderRadius: 10,
        titleFont: { size: 12, weight: 700 },
        bodyFont: { size: 11 },
        displayColors: false,
        callbacks: {
          title: (ctx) => {
            if (ctx.length > 0) {
              return `Point ${ctx[0].label}`;
            }
            return "";
          },
          label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#e5e7eb",
          drawBorder: false,
        },
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className={`sensor-card ${status}`}>
      <div className="sensor-card-title">
        <div>{label}</div>
        <div className={`sensor-status ${status}`}>{status || "unknown"}</div>
      </div>
      <div className="sensor-value">
        {value ?? "--"} <span>{unit}</span>
      </div>
      <div className="sensor-chart chart-canvas-wrapper">
        <Line data={chartData} options={chartOptions} />
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

  const temperaturePoints = chartData.map((item) => item.temperature);
  const turbidityPoints = chartData.map((item) => item.turbidity);
  const lightPoints = chartData.map((item) => item.light);

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
          data={temperaturePoints}
          status={latestReading?.status?.temperature}
          color="#ef4444"
          fillColor="rgba(239, 68, 68, 0.14)"
        />
        <SensorChart
          label="Turbidity"
          value={latestReading?.turbidity}
          unit="NTU"
          data={turbidityPoints}
          status={latestReading?.status?.turbidity}
          color="#0ea5e9"
          fillColor="rgba(14, 165, 233, 0.14)"
        />
        <SensorChart
          label="Light Intensity"
          value={latestReading?.light}
          unit="lux"
          data={lightPoints}
          status={latestReading?.status?.light}
          color="#f59e0b"
          fillColor="rgba(245, 158, 11, 0.14)"
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
          <button 
            className="actuator-button cooler-on" 
            type="button" 
            onClick={() => onActuatorCommand("cooler", "on")}
            title="Turn on cooler to lower temperature"
          >
            ❄️ Cooler ON
          </button>
          <button 
            className="actuator-button cooler-off" 
            type="button" 
            onClick={() => onActuatorCommand("cooler", "off")}
            title="Turn off cooler"
          >
            ❄️ Cooler OFF
          </button>
          <button 
            className="actuator-button filter-on" 
            type="button" 
            onClick={() => onActuatorCommand("filter", "on")}
            title="Turn on filter to reduce turbidity"
          >
            🔄 Filter ON
          </button>
          <button 
            className="actuator-button filter-off" 
            type="button" 
            onClick={() => onActuatorCommand("filter", "off")}
            title="Turn off filter"
          >
            🔄 Filter OFF
          </button>
          <button 
            className="actuator-button light-on" 
            type="button" 
            onClick={() => onActuatorCommand("light", "on")}
            title="Turn on light"
          >
            💡 Light ON
          </button>
          <button 
            className="actuator-button light-off" 
            type="button" 
            onClick={() => onActuatorCommand("light", "off")}
            title="Turn off light"
          >
            💡 Light OFF
          </button>
        </div>
      </div>
    </section>
  );
}

export default MonitorDashboard;
