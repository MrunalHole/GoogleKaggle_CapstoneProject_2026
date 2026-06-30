import { AlertTriangle, Database, Users, GitBranch } from "lucide-react";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">About this project</span>
          <h1>What Lucent is — and isn't</h1>
          <p>
            Transparency about how this was built matters as much as the
            features themselves. Here's the honest picture.
          </p>
        </div>

        <div className="about-grid">
          <div className="card about-block">
            <Database size={20} />
            <h2>The screening model</h2>
            <p>
              The voice screening tool is trained on the UCI Parkinson's
              voice dataset — 195 voice recordings from just 32 people (23
              with Parkinson's, 9 without). Two classifiers, Random Forest
              and an SVM, were compared using 5-fold cross-validation.
            </p>
          </div>

          <div className="card about-block">
            <Users size={20} />
            <h2>Known limitations</h2>
            <ul>
              <li>Only 32 subjects — far too small to generalize confidently</li>
              <li>Classes are imbalanced (147 PD recordings vs. 48 healthy)</li>
              <li>
                Cross-validation wasn't grouped by person, so recordings from
                the same speaker may appear in both training and test sets —
                this likely inflates the reported accuracy
              </li>
              <li>No testing on an independent, external dataset</li>
              <li>Narrow demographic range in the original recordings</li>
            </ul>
          </div>

          <div className="card about-block">
            <AlertTriangle size={20} />
            <h2>What this means for you</h2>
            <p>
              Treat every score from the screening tool as a demonstration of
              how this kind of model works — not a measurement of your
              health. It is not validated for clinical use, and a "low
              likelihood" or "elevated likelihood" result should never
              replace seeing a neurologist.
            </p>
          </div>

          <div className="card about-block">
            <GitBranch size={20} />
            <h2>Open for collaboration</h2>
            <p>
              This is a student/capstone project built collaboratively. The
              ML pipeline, the GCP agent deployment scaffold, and this
              frontend are maintained as a single repository — contributions
              and corrections are welcome.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
