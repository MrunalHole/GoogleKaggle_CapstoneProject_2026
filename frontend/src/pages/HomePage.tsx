import { Link } from "react-router-dom";
import { ArrowRight, Mic, FileSpreadsheet, Activity, Brain as BrainIcon } from "lucide-react";
import BrainScene from "../components/three/BrainScene";
import SynapseDivider from "../components/ui/SynapseDivider";
import Button from "../components/ui/Button";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home">
      {/* ---------- HERO ---------- */}
      <section className="home-hero">
        <div className="container home-hero__inner">
          <div className="home-hero__copy">
            <span className="eyebrow">Parkinson's, explained and explored</span>
            <h1>
              A brain you can turn,<br /> a disease you can <em>understand</em>.
            </h1>
            <p>
              Lucent is an interactive guide to Parkinson's disease — explore
              an animated 3D brain, simulate how symptoms progress, and try a
              voice-based screening tool built on real research data.
            </p>
            <div className="home-hero__actions">
              <Link to="/explore">
                <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} iconPosition="right">
                  Explore the brain
                </Button>
              </Link>
              <Link to="/screening">
                <Button variant="secondary" size="lg" icon={<Mic size={18} />}>
                  Try voice screening
                </Button>
              </Link>
            </div>
          </div>

          <div className="home-hero__brain" aria-hidden="true">
            <BrainScene dopamineLevel={80} autoRotate interactive={false} />
          </div>
        </div>
      </section>

      <SynapseDivider />

      {/* ---------- WHAT YOU CAN DO ---------- */}
      <section className="section">
        <div className="container">
          <div className="page-head" style={{ paddingTop: 0 }}>
            <span className="eyebrow">What's inside</span>
            <h2 style={{ fontSize: "var(--fs-xl)", marginTop: "var(--sp-3)" }}>
              Four ways to engage with Parkinson's
            </h2>
          </div>

          <div className="home-grid">
            <FeatureCard
              icon={<BrainIcon size={22} />}
              title="Explore the 3D brain"
              description="Rotate an interactive brain model and click through the regions Parkinson's affects most — from the substantia nigra to the motor cortex."
              to="/explore"
            />
            <FeatureCard
              icon={<Activity size={22} />}
              title="Simulate disease stages"
              description="See how dopamine levels and symptoms shift across the five recognized stages of Parkinson's, from subtle onset to advanced care needs."
              to="/simulator"
            />
            <FeatureCard
              icon={<Mic size={22} />}
              title="Screen your voice"
              description="Record a short voice clip or upload one to see how a machine learning model trained on vocal biomarkers responds — built for education, not diagnosis."
              to="/screening"
            />
            <FeatureCard
              icon={<FileSpreadsheet size={22} />}
              title="Track symptoms & meds"
              description="Log daily symptoms, set medication reminders, and watch trends build over time on your personal dashboard."
              to="/dashboard"
            />
          </div>
        </div>
      </section>

      <SynapseDivider fading />

      {/* ---------- CONTEXT STRIP ---------- */}
      <section className="section home-context">
        <div className="container home-context__inner">
          <div>
            <span className="eyebrow">Why voice?</span>
            <h2 style={{ fontSize: "var(--fs-lg)", marginTop: "var(--sp-3)" }}>
              Parkinson's changes the voice years before some motor symptoms
              are obvious.
            </h2>
          </div>
          <p>
            Subtle shifts in pitch stability, loudness, and breathiness are
            measurable with simple acoustic analysis. The screening tool here
            is trained on the well-known UCI Parkinson's voice dataset — a
            small research dataset of 32 people — so treat it as a glimpse
            into how this kind of detection works, not a clinical result.
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link to={to} className="feature-card card card--interactive">
      <div className="feature-card__icon">{icon}</div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__desc">{description}</p>
      <span className="feature-card__cta">
        Open <ArrowRight size={14} />
      </span>
    </Link>
  );
}
