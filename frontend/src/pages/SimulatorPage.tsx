import { useState } from "react";
import BrainScene from "../components/three/BrainScene";
import { diseaseStages } from "../data/diseaseData";
import "./SimulatorPage.css";

export default function SimulatorPage() {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = diseaseStages[stageIndex];

  return (
    <div className="simulator">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Disease-stage simulator</span>
          <h1>How Parkinson's progresses, stage by stage</h1>
          <p>
            Based on the Hoehn and Yahr scale, a widely used framework for
            describing how Parkinson's symptoms typically progress. Drag the
            slider to see how dopamine levels and symptoms shift — every
            person's timeline differs, often spanning many years per stage.
          </p>
        </div>

        <div className="simulator-layout">
          <div className="simulator-canvas card">
            <BrainScene dopamineLevel={stage.dopamineLevel} autoRotate />
            <div className="simulator-canvas__readout">
              <p className="simulator-canvas__label">Illustrative dopamine activity</p>
              <div className="score-bar">
                <div
                  className="score-bar__fill"
                  style={{
                    width: `${stage.dopamineLevel}%`,
                    background:
                      stage.dopamineLevel > 60
                        ? "var(--color-success)"
                        : stage.dopamineLevel > 30
                        ? "var(--color-warning)"
                        : "var(--color-danger)",
                  }}
                />
              </div>
              <span className="simulator-canvas__percent">{stage.dopamineLevel}%</span>
            </div>
          </div>

          <div className="simulator-detail">
            <div className="simulator-slider">
              <input
                type="range"
                min={0}
                max={diseaseStages.length - 1}
                value={stageIndex}
                onChange={(e) => setStageIndex(Number(e.target.value))}
                aria-label="Disease stage"
              />
              <div className="simulator-slider__ticks">
                {diseaseStages.map((s, i) => (
                  <button
                    key={s.stage}
                    className={`simulator-slider__tick ${
                      i === stageIndex ? "simulator-slider__tick--active" : ""
                    }`}
                    onClick={() => setStageIndex(i)}
                  >
                    {s.hoehnYahr}
                  </button>
                ))}
              </div>
            </div>

            <div className="card simulator-card">
              <span className="tag tag--primary">{stage.hoehnYahr}</span>
              <h2>{stage.title}</h2>
              <p className="simulator-card__desc">{stage.description}</p>

              <div className="simulator-card__symptoms">
                <div>
                  <p className="explore-panel__label">Motor symptoms</p>
                  <ul className="simulator-list">
                    {stage.motorSymptoms.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="explore-panel__label">Non-motor symptoms</p>
                  <ul className="simulator-list">
                    {stage.nonMotorSymptoms.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="disclaimer">
              <p>
                <strong>This is a simplified, illustrative model.</strong>{" "}
                Progression speed and symptom severity vary enormously between
                individuals. Many people live full, active lives for years
                after diagnosis. This simulator is for education only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
