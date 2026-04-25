import { useEffect, useRef, useMemo, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PRESETS = [
  { value: "5m", label: "Last 5 minutes", minutes: 5 },
  { value: "15m", label: "Last 15 minutes", minutes: 15 },
  { value: "30m", label: "Last 30 minutes", minutes: 30 },
  { value: "1h", label: "Last hour", minutes: 60 },
  { value: "all", label: "All history", minutes: null },
];

function aggregateData(data, maxPoints = 250) {
  if (data.length <= maxPoints) {
    return data;
  }
  
  const groupSize = Math.ceil(data.length / maxPoints);
  const aggregated = [];
  
  for (let i = 0; i < data.length; i += groupSize) {
    const group = data.slice(i, i + groupSize);
    if (group.length === 0) continue;
    
    const avgTemp = group.reduce((sum, item) => sum + (item.temperature || 0), 0) / group.length;
    const avgTurb = group.reduce((sum, item) => sum + (item.turbidity || 0), 0) / group.length;
    const avgLight = group.reduce((sum, item) => sum + (item.light || 0), 0) / group.length;
    
    aggregated.push({
      timestamp: group[group.length - 1].timestamp,
      temperature: avgTemp,
      turbidity: avgTurb,
      light: avgLight,
      status: group[group.length - 1].status || {},
    });
  }
  
  return aggregated;
}

function buildRange(preset, customStart, customEnd) {
  const now = Date.now();
  let startTime = null;
  let endTime = now;

  if (customStart && customEnd) {
    const parsedStart = Date.parse(customStart);
    const parsedEnd = Date.parse(customEnd);
    if (!Number.isNaN(parsedStart) && !Number.isNaN(parsedEnd)) {
      startTime = parsedStart;
      endTime = parsedEnd;
    }
  }

  if (!startTime) {
    if (preset === "all") {
      startTime = 0;
    } else {
      const range = PRESETS.find((item) => item.value === preset);
      startTime = range?.minutes != null ? now - range.minutes * 60 * 1000 : 0;
    }
  }

  return { startTime, endTime };
}

function Analytics({ history }) {
  const [range, setRange] = useState("1h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { startTime, endTime } = buildRange(range, customStart, customEnd);

  const filtered = useMemo(() => {
    return history
      .filter((entry) => {
        const ts = Date.parse(entry.timestamp);
        return !Number.isNaN(ts) && ts >= startTime && ts <= endTime;
      })
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }, [history, startTime, endTime]);

  const aggregated = useMemo(() => {
    return aggregateData(filtered, 250);
  }, [filtered]);

  const chartLabels = aggregated.map((entry) => new Date(entry.timestamp).toLocaleTimeString());
  const temperatureData = aggregated.map((entry) => entry.temperature);
  const turbidityData = aggregated.map((entry) => entry.turbidity);
  const lightData = aggregated.map((entry) => entry.light);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 12, weight: 600 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        borderRadius: 8,
        titleFont: { size: 12, weight: 700 },
        bodyFont: { size: 11 },
        displayColors: true,
        callbacks: {
          title: (ctx) => {
            if (ctx.length > 0) {
              const timestamp = aggregated[ctx[0].dataIndex]?.timestamp;
              return timestamp ? new Date(timestamp).toLocaleString() : "";
            }
            return "";
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "#e5e7eb",
          drawBorder: false,
        },
        ticks: {
          font: { size: 11 },
          color: "#6b7280",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 10 },
          color: "#6b7280",
          maxTicksLimit: 8,
        },
      },
    },
  };

  const temperatureChart = {
    labels: chartLabels,
    datasets: [
      {
        label: "Temperature (°C)",
        data: temperatureData,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const turbidityChart = {
    labels: chartLabels,
    datasets: [
      {
        label: "Turbidity (NTU)",
        data: turbidityData,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const lightChart = {
    labels: chartLabels,
    datasets: [
      {
        label: "Light Intensity (lux)",
        data: lightData,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251, 191, 36, 0.1)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#fbbf24",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  function downloadData() {
    const csv = [
      ["Timestamp", "Temperature (°C)", "Turbidity (NTU)", "Light (lux)", "Overall Status"],
      ...aggregated.map((row) => [
        new Date(row.timestamp).toLocaleString(),
        row.temperature.toFixed(2),
        row.turbidity.toFixed(2),
        row.light.toFixed(0),
        row.status?.overall || "unknown",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <section className="dataset-panel">
      <div className="panel-header">
        <div>
          <h2>Sensor History & Analytics</h2>
          <p>Visualize and analyze historical sensor data with time-based filtering and export options.</p>
        </div>
      </div>

      <div className="analytics-controls">
        <div className="preset-buttons">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={range === preset.value ? "preset-button active" : "preset-button"}
              onClick={() => {
                setRange(preset.value);
                setCustomStart("");
                setCustomEnd("");
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="custom-dates">
          <label>
            From
            <input
              type="datetime-local"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="datetime-local"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
            />
          </label>
        </div>
      </div>

      <button className="download-button" onClick={downloadData}>
        Download Raw Data (CSV)
      </button>

      <div className="data-summary">
        Showing <strong>{aggregated.length}</strong> data points from <strong>{filtered.length}</strong> raw readings
        {filtered.length > 250 && " (aggregated)"}
      </div>

      {aggregated.length === 0 ? (
        <div className="empty-state">No readings available for the selected time range.</div>
      ) : (
        <>
          <div className="analytics-charts">
            <div className="chart-container">
              <h3>Temperature Trend</h3>
              <div className="chart-canvas-wrapper">
                <Line data={temperatureChart} options={chartOptions} />
              </div>
            </div>

            <div className="chart-container">
              <h3>Turbidity Trend</h3>
              <div className="chart-canvas-wrapper">
                <Line data={turbidityChart} options={chartOptions} />
              </div>
            </div>

            <div className="chart-container">
              <h3>Light Intensity Trend</h3>
              <div className="chart-canvas-wrapper">
                <Line data={lightChart} options={chartOptions} />
              </div>
            </div>
          </div>

          <div className="history-grid">
            <h3>Data Table</h3>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Temperature (°C)</th>
                  <th>Turbidity (NTU)</th>
                  <th>Light (lux)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((reading, index) => (
                  <tr key={index}>
                    <td>{new Date(reading.timestamp).toLocaleString()}</td>
                    <td>{reading.temperature.toFixed(2)}</td>
                    <td>{reading.turbidity.toFixed(2)}</td>
                    <td>{reading.light.toFixed(0)}</td>
                    <td>{reading.status?.overall ?? "unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default Analytics;
