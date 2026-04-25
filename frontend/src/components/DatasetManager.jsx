import { useState } from "react";

function DatasetManager({datasets, activeProfile, onLoadProfile, onCreateProfile}) {
  const [form, setForm] = useState({
    speciesName: "",
    temperatureMin: "",
    temperatureMax: "",
    turbidityMin: "",
    turbidityMax: "",
    lightMin: "",
    lightMax: "",
    guidelines: "",
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitProfile(event) {
    event.preventDefault();
    onCreateProfile({
      speciesName: form.speciesName,
      temperatureMin: Number(form.temperatureMin),
      temperatureMax: Number(form.temperatureMax),
      turbidityMin: Number(form.turbidityMin),
      turbidityMax: Number(form.turbidityMax),
      lightMin: Number(form.lightMin),
      lightMax: Number(form.lightMax),
      guidelines: form.guidelines,
    });
    setForm({
      speciesName: "",
      temperatureMin: "",
      temperatureMax: "",
      turbidityMin: "",
      turbidityMax: "",
      lightMin: "",
      lightMax: "",
      guidelines: "",
    });
  }

  return (
    <section className="dataset-panel">
      <div className="panel-header">
        <div>
          <h2>Dataset &amp; Profile Management</h2>
          <p>Browse profiles, load one as active, or add a new profile to the CSV storage.</p>
        </div>
      </div>

      <div className="dataset-grid">
        <div className="dataset-list">
          <h3>Available profiles</h3>
          {datasets.length === 0 ? (
            <p>No datasets available.</p>
          ) : (
            <ul>
              {datasets.map((dataset) => (
                <li key={dataset.speciesName}>
                  <div>
                    <strong>{dataset.speciesName}</strong>
                    <span>{dataset.speciesName === activeProfile?.speciesName ? "Active" : ""}</span>
                  </div>
                  <button type="button" onClick={() => onLoadProfile(dataset.speciesName)}>
                    Load
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="dataset-form" onSubmit={submitProfile}>
          <h3>Add New Profile</h3>
          <label>
            Species / Name
            <input value={form.speciesName} onChange={(event) => updateField("speciesName", event.target.value)} required />
          </label>
          <label>
            Temperature min (°C)
            <input type="number" step="0.1" value={form.temperatureMin} onChange={(event) => updateField("temperatureMin", event.target.value)} required />
          </label>
          <label>
            Temperature max (°C)
            <input type="number" step="0.1" value={form.temperatureMax} onChange={(event) => updateField("temperatureMax", event.target.value)} required />
          </label>
          <label>
            Turbidity min (NTU)
            <input type="number" step="0.1" value={form.turbidityMin} onChange={(event) => updateField("turbidityMin", event.target.value)} required />
          </label>
          <label>
            Turbidity max (NTU)
            <input type="number" step="0.1" value={form.turbidityMax} onChange={(event) => updateField("turbidityMax", event.target.value)} required />
          </label>
          <label>
            Light min (lux)
            <input type="number" step="0.1" value={form.lightMin} onChange={(event) => updateField("lightMin", event.target.value)} required />
          </label>
          <label>
            Light max (lux)
            <input type="number" step="0.1" value={form.lightMax} onChange={(event) => updateField("lightMax", event.target.value)} required />
          </label>
          <label>
            Guidelines
            <textarea value={form.guidelines} onChange={(event) => updateField("guidelines", event.target.value)} required />
          </label>
          <button type="submit">Add profile</button>
        </form>
      </div>
    </section>
  );
}

export default DatasetManager;
