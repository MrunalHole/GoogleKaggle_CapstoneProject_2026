import { Link } from "react-router-dom";
import { Brain, GitFork } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <div className="footer__brand-row">
            <Brain size={20} strokeWidth={1.6} />
            <span>Lucent</span>
          </div>
          <p className="footer__tagline">
            An educational explorer for understanding Parkinson's disease —
            built as a research and capstone project.
          </p>
        </div>

        <div className="footer__col">
          <p className="footer__heading">Explore</p>
          <Link to="/explore">The 3D Brain</Link>
          <Link to="/simulator">Stage Simulator</Link>
          <Link to="/treatments">Treatments</Link>
        </div>

        <div className="footer__col">
          <p className="footer__heading">Tools</p>
          <Link to="/screening">Voice Screening</Link>
          <Link to="/dashboard">My Dashboard</Link>
          <Link to="/assistant">Ask Lucent</Link>
        </div>

        <div className="footer__col">
          <p className="footer__heading">Project</p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="footer__github"
          >
            <GitFork size={15} /> View source
          </a>
          <Link to="/about">About &amp; limitations</Link>
        </div>
      </div>

      <div className="container footer__legal">
        <p>
          Lucent is a screening and education tool, not a medical device.
          It does not diagnose Parkinson's disease. Always consult a
          qualified neurologist for clinical evaluation.
        </p>
      </div>
    </footer>
  );
}
