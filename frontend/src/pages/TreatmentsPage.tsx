import { useState } from "react";
import { Pill, Zap, HeartPulse } from "lucide-react";
import { treatments, type TreatmentOption } from "../data/diseaseData";
import "./TreatmentsPage.css";

const categoryIcon = {
  medication: <Pill size={18} />,
  procedure: <Zap size={18} />,
  therapy: <HeartPulse size={18} />,
};

const categoryLabel = {
  medication: "Medication",
  procedure: "Procedure",
  therapy: "Therapy",
};

export default function TreatmentsPage() {
  const [active, setActive] = useState<TreatmentOption>(treatments[0]);

  return (
    <div className="treatments">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Treatment landscape</span>
          <h1>How Parkinson's is treated today</h1>
          <p>
            There's no cure yet, but a combination of medication, procedures,
            and therapy can manage symptoms effectively for many years. Here's
            an overview of the main approaches.
          </p>
        </div>

        <div className="treatments-layout">
          <div className="treatments-list">
            {treatments.map((t) => (
              <button
                key={t.id}
                className={`treatments-list__item ${
                  active.id === t.id ? "treatments-list__item--active" : ""
                }`}
                onClick={() => setActive(t)}
              >
                <span className="treatments-list__icon">{categoryIcon[t.category]}</span>
                <span>
                  <span className="treatments-list__name">{t.name}</span>
                  <span className="treatments-list__cat">{categoryLabel[t.category]}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="card treatments-detail">
            <span className="tag tag--primary">{categoryLabel[active.category]}</span>
            <h2>{active.name}</h2>
            <p className="treatments-detail__summary">{active.summary}</p>

            <div className="treatments-detail__block">
              <p className="explore-panel__label">How it works</p>
              <p>{active.howItWorks}</p>
            </div>

            <div className="treatments-detail__block treatments-detail__block--highlight">
              <p className="explore-panel__label">Things to know</p>
              <ul>
                {active.considerations.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="disclaimer treatments-disclaimer">
          <p>
            <strong>Educational overview only.</strong> Treatment decisions
            depend on individual diagnosis, symptom severity, and medical
            history. Always work with a neurologist to build a treatment
            plan.
          </p>
        </div>
      </div>
    </div>
  );
}
