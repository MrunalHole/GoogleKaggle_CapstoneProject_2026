import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="container" style={{ padding: "var(--sp-9) 0", textAlign: "center" }}>
      <span className="eyebrow">404</span>
      <h1 style={{ fontSize: "var(--fs-xl)", marginTop: "var(--sp-3)" }}>
        This page wandered off the path
      </h1>
      <p style={{ marginTop: "var(--sp-4)", color: "var(--color-body)" }}>
        The page you're looking for doesn't exist. Let's get you back.
      </p>
      <div style={{ marginTop: "var(--sp-6)" }}>
        <Link to="/">
          <Button variant="primary">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
