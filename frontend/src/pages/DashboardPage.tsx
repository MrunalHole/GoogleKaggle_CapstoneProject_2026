import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Plus, Trash2, Pill, Check } from "lucide-react";
import { useDashboardStore } from "../store/useAppStore";
import Button from "../components/ui/Button";
import "./DashboardPage.css";

const SYMPTOM_FIELDS = [
  { key: "tremor", label: "Tremor" },
  { key: "stiffness", label: "Stiffness" },
  { key: "balance", label: "Balance issues" },
  { key: "mood", label: "Mood" },
  { key: "sleepQuality", label: "Sleep quality" },
] as const;

export default function DashboardPage() {
  const { symptomEntries, medications, addSymptomEntry, removeSymptomEntry, addMedication, removeMedication, toggleDose } =
    useDashboardStore();

  const [form, setForm] = useState({
    tremor: 3,
    stiffness: 3,
    balance: 3,
    mood: 5,
    sleepQuality: 5,
    notes: "",
  });

  const [medForm, setMedForm] = useState({ name: "", dosage: "", times: "08:00,20:00" });

  const chartData = [...symptomEntries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((e) => ({
      date: new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      Tremor: e.tremor,
      Stiffness: e.stiffness,
      Balance: e.balance,
      Mood: e.mood,
      Sleep: e.sleepQuality,
    }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="dashboard">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">My dashboard</span>
          <h1>Track symptoms and medication over time</h1>
          <p>
            Everything here is stored only in your browser — log a quick
            daily check-in and set up medication reminders to build a
            picture you can bring to your next appointment.
          </p>
        </div>

        <div className="dashboard-grid">
          {/* ---------- Symptom log form ---------- */}
          <div className="card dashboard-card">
            <h2>Today's check-in</h2>
            <div className="dashboard-sliders">
              {SYMPTOM_FIELDS.map((f) => (
                <label key={f.key} className="dashboard-slider">
                  <div className="dashboard-slider__top">
                    <span>{f.label}</span>
                    <span className="dashboard-slider__val">{form[f.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [f.key]: Number(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
            <textarea
              className="dashboard-notes"
              placeholder="Notes for today (optional)"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                addSymptomEntry({ date: today, ...form });
                setForm({ tremor: 3, stiffness: 3, balance: 3, mood: 5, sleepQuality: 5, notes: "" });
              }}
            >
              Log today's entry
            </Button>
          </div>

          {/* ---------- Chart ---------- */}
          <div className="card dashboard-card dashboard-card--wide">
            <h2>Trends over time</h2>
            {chartData.length === 0 ? (
              <p className="dashboard-empty">No entries yet — log your first check-in to see trends here.</p>
            ) : (
              <div className="dashboard-chart">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#ddd7d2" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#565656" fontSize={12} />
                    <YAxis domain={[0, 10]} stroke="#565656" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "#fffdfc",
                        border: "1px solid #ddd7d2",
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Tremor" stroke="#c4685f" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Stiffness" stroke="#d9924f" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Balance" stroke="#e88988" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Mood" stroke="#7ea787" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Sleep" stroke="#343434" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ---------- Medication reminders ---------- */}
          <div className="card dashboard-card dashboard-card--wide">
            <h2>Medication reminders</h2>
            <div className="dashboard-med-form">
              <input
                placeholder="Medication name"
                value={medForm.name}
                onChange={(e) => setMedForm((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                placeholder="Dosage (e.g. 100mg)"
                value={medForm.dosage}
                onChange={(e) => setMedForm((s) => ({ ...s, dosage: e.target.value }))}
              />
              <input
                placeholder="Times, comma separated (e.g. 08:00,14:00,20:00)"
                value={medForm.times}
                onChange={(e) => setMedForm((s) => ({ ...s, times: e.target.value }))}
              />
              <Button
                variant="secondary"
                icon={<Plus size={16} />}
                disabled={!medForm.name.trim()}
                onClick={() => {
                  addMedication({
                    name: medForm.name,
                    dosage: medForm.dosage,
                    times: medForm.times.split(",").map((t) => t.trim()).filter(Boolean),
                  });
                  setMedForm({ name: "", dosage: "", times: "08:00,20:00" });
                }}
              >
                Add
              </Button>
            </div>

            {medications.length === 0 ? (
              <p className="dashboard-empty">No medications added yet.</p>
            ) : (
              <ul className="dashboard-med-list">
                {medications.map((med) => (
                  <li key={med.id} className="dashboard-med-item">
                    <div className="dashboard-med-item__info">
                      <Pill size={16} />
                      <div>
                        <p className="dashboard-med-item__name">{med.name}</p>
                        <p className="dashboard-med-item__dose">{med.dosage}</p>
                      </div>
                    </div>
                    <div className="dashboard-med-item__doses">
                      {med.times.map((t) => {
                        const key = `${today}_${t}`;
                        const taken = med.taken[key];
                        return (
                          <button
                            key={t}
                            className={`dashboard-dose-pill ${taken ? "dashboard-dose-pill--taken" : ""}`}
                            onClick={() => toggleDose(med.id, key)}
                          >
                            {taken && <Check size={12} />} {t}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      className="dashboard-med-item__remove"
                      onClick={() => removeMedication(med.id)}
                      aria-label={`Remove ${med.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ---------- History ---------- */}
          {symptomEntries.length > 0 && (
            <div className="card dashboard-card dashboard-card--wide">
              <h2>Entry history</h2>
              <ul className="dashboard-history">
                {symptomEntries.slice(0, 8).map((e) => (
                  <li key={e.id} className="dashboard-history__item">
                    <span className="dashboard-history__date">
                      {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span className="dashboard-history__tags">
                      {SYMPTOM_FIELDS.map((f) => (
                        <span key={f.key} className="tag">
                          {f.label}: {e[f.key]}
                        </span>
                      ))}
                    </span>
                    {e.notes && <span className="dashboard-history__notes">{e.notes}</span>}
                    <button onClick={() => removeSymptomEntry(e.id)} aria-label="Remove entry">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
