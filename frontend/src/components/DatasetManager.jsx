import { useState, useRef } from "react";

function DatasetManager({datasets, activeProfile, onLoadProfile, onCreateProfile}) {
  const [form, setForm] = useState({
    speciesName: "",
    temperatureMin: "",
    temperatureMax: "",
    turbidityMin: "",
    turbidityMax: "",
    timeInLight: "",
    guidelines: "",
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const confirmationRef = useRef(null);

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
      timeInLight: Number(form.timeInLight),
      guidelines: form.guidelines,
    });
    
    // Show confirmation
    setShowConfirmation(true);
    if (confirmationRef.current) {
      confirmationRef.current.classList.add("show");
    }
    setTimeout(() => {
      setShowConfirmation(false);
      if (confirmationRef.current) {
        confirmationRef.current.classList.remove("show");
      }
    }, 2000);
    
    setForm({
      speciesName: "",
      temperatureMin: "",
      temperatureMax: "",
      turbidityMin: "",
      turbidityMax: "",
      timeInLight: "",
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

      {showConfirmation && (
        <div className="confirmation-toast" ref={confirmationRef}>
          ✓ DONE! Profile added successfully.
        </div>
      )}

      <div className="dataset-grid">
        <div className="dataset-list">
          <h3>Available profiles</h3>
          {datasets.length === 0 ? (
            <p>No datasets available.</p>
          ) : (
            <ul>
              {datasets.map((dataset) => (
                <li key={dataset.speciesName} className={dataset.speciesName === activeProfile?.speciesName ? "active-profile" : ""}>
                  <div className="profile-info">
                    <input 
                      type="checkbox" 
                      checked={dataset.speciesName === activeProfile?.speciesName}
                      onChange={() => onLoadProfile(dataset.speciesName)}
                      className="profile-checkbox"
                    />
                    <div>
                      <strong>{dataset.speciesName}</strong>
                      {dataset.speciesName === activeProfile?.speciesName && <span className="active-badge">● Active</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => onLoadProfile(dataset.speciesName)} className="load-button">
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
            Time in Light (hours/day)
            <input type="number" step="0.1" value={form.timeInLight} onChange={(event) => updateField("timeInLight", event.target.value)} required />
          </label>
          <label>
            Guidelines
            <textarea value={form.guidelines} onChange={(event) => updateField("guidelines", event.target.value)} required />
          </label>
          <button type="submit" className="submit-button">Add profile</button>
        </form>
      </div>
    </section>
  );
}


export default DatasetManager;
