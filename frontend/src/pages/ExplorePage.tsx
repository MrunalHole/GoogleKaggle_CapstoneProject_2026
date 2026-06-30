import { useState } from "react";
import BrainScene from "../components/three/BrainScene";
import { brainRegions } from "../data/brainRegions";
import { RotateCcw, MousePointerClick } from "lucide-react";
import "./ExplorePage.css";

export default function ExplorePage() {
  const [activeRegion, setActiveRegion] = useState<string | null>(
    brainRegions[0].id
  );
  const [autoRotate, setAutoRotate] = useState(false);

  const region = brainRegions.find((r) => r.id === activeRegion) ?? brainRegions[0];

  return (
    <div className="explore">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Interactive 3D model</span>
          <h1>Explore the brain regions Parkinson's affects</h1>
          <p>
            Drag to rotate, scroll to zoom, and click any glowing point to
            learn what that region does — and how Parkinson's disease changes
            it.
          </p>
        </div>

        <div className="explore-layout">
          <div className="explore-canvas card">
            <div className="explore-canvas__hint">
              <MousePointerClick size={14} /> Click a point to learn more
            </div>
            <button
              className="explore-canvas__rotate"
              onClick={() => setAutoRotate((v) => !v)}
              aria-pressed={autoRotate}
            >
              <RotateCcw size={14} />
              {autoRotate ? "Stop rotation" : "Auto-rotate"}
            </button>
            <BrainScene
              dopamineLevel={85}
              activeRegion={activeRegion}
              onSelectRegion={setActiveRegion}
              autoRotate={autoRotate}
            />
          </div>

          <div className="explore-panel">
            <div className="explore-panel__tabs">
              {brainRegions.map((r) => (
                <button
                  key={r.id}
                  className={`explore-panel__tab ${
                    r.id === activeRegion ? "explore-panel__tab--active" : ""
                  }`}
                  style={{ "--dot-color": r.color } as React.CSSProperties}
                  onClick={() => setActiveRegion(r.id)}
                >
                  <span className="explore-panel__dot" />
                  {r.name}
                </button>
              ))}
            </div>

            <div className="card explore-panel__detail">
              <h2>{region.name}</h2>
              <p className="explore-panel__role">{region.role}</p>

              <div className="explore-panel__block">
                <p className="explore-panel__label">What it does</p>
                <p>{region.description}</p>
              </div>

              <div className="explore-panel__block explore-panel__block--highlight">
                <p className="explore-panel__label">In Parkinson's disease</p>
                <p>{region.parkinsonsRelevance}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
