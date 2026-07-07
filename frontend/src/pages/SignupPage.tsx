import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, AlertTriangle } from "lucide-react";
import { signup } from "../lib/api";
import { useAuthStore } from "../store/useAppStore";
import Button from "../components/ui/Button";
import "./AuthPage.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Emergency relative info
  const [relativeName, setRelativeName] = useState("");
  const [relativeRelation, setRelativeRelation] = useState("Son");
  const [relativeContact, setRelativeContact] = useState("");
  
  // Doctor details
  const [doctorName, setDoctorName] = useState("");
  const [doctorContact, setDoctorContact] = useState("");
  
  // Patient Location
  const [userLocation, setUserLocation] = useState("New York");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!relativeName.trim() || !relativeContact.trim() || !doctorName.trim() || !doctorContact.trim()) {
      setError("Please fill in all mandatory relative and doctor contact details.");
      return;
    }

    setLoading(true);
    try {
      const token = await signup(
        email,
        password,
        relativeName,
        relativeRelation,
        relativeContact,
        doctorName,
        doctorContact,
        userLocation
      );
      await setSession(token);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="container" style={{ maxWidth: "540px" }}>
        <div className="card auth-card" style={{ maxWidth: "100%" }}>
          <div className="page-head" style={{ paddingTop: 0, marginBottom: "var(--sp-4)" }}>
            <span className="eyebrow">Create your account</span>
            <h1>Register Patient Portal</h1>
            <p>Please enter your details to set up your account, emergency contact alerts, and doctor notification preferences.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            
            {/* --- Section 1: Account credentials --- */}
            <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--sp-4)", marginBottom: "var(--sp-2)" }}>
              <h3 style={{ fontSize: "var(--fs-md)", color: "var(--color-heading)", marginBottom: "var(--sp-3)" }}>1. Account Credentials</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--sp-3)" }}>
                <label>
                  Email Address *
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password *
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span className="auth-form__hint">At least 8 characters</span>
                </label>
              </div>
            </div>

            {/* --- Section 2: Relative (Emergency Contact) --- */}
            <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--sp-4)", marginBottom: "var(--sp-2)" }}>
              <h3 style={{ fontSize: "var(--fs-md)", color: "var(--color-heading)", marginBottom: "var(--sp-3)" }}>2. Emergency Contact (Relative)</h3>
              <p className="auth-form__hint" style={{ marginBottom: "var(--sp-3)" }}>
                A notification will be sent automatically to this relative if any of your screenings show elevated risk.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--sp-3)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                  <label>
                    Relative's Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={relativeName}
                      onChange={(e) => setRelativeName(e.target.value)}
                    />
                  </label>
                  <label>
                    Relation *
                    <select
                      value={relativeRelation}
                      onChange={(e) => setRelativeRelation(e.target.value)}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--sp-3)",
                        fontSize: "var(--fs-sm)",
                        fontFamily: "inherit",
                        background: "var(--color-bg)",
                        height: "43px"
                      }}
                    >
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Caregiver">Caregiver</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
                <label>
                  Relative's Contact Email *
                  <input
                    type="email"
                    required
                    placeholder="relative@email.com"
                    value={relativeContact}
                    onChange={(e) => setRelativeContact(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* --- Section 3: Doctor Details & Location --- */}
            <div style={{ paddingBottom: "var(--sp-2)" }}>
              <h3 style={{ fontSize: "var(--fs-md)", color: "var(--color-heading)", marginBottom: "var(--sp-3)" }}>3. Healthcare Provider & Location</h3>
              <p className="auth-form__hint" style={{ marginBottom: "var(--sp-3)" }}>
                We will email your screening reports to this doctor. Location details help configure portal clinical routing.
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--sp-3)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                  <label>
                    Doctor's Name *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Sarah Jenkins"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </label>
                  <label>
                    Your Location *
                    <select
                      value={userLocation}
                      onChange={(e) => setUserLocation(e.target.value)}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--sp-3)",
                        fontSize: "var(--fs-sm)",
                        fontFamily: "inherit",
                        background: "var(--color-bg)",
                        height: "43px"
                      }}
                    >
                      <option value="New York">New York</option>
                      <option value="Chicago">Chicago</option>
                      <option value="London">London</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
                
                <label>
                  Doctor's Contact Email *
                  <input
                    type="email"
                    required
                    placeholder="doctor@clinic.com"
                    value={doctorContact}
                    onChange={(e) => setDoctorContact(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {error && (
              <p className="auth-form__error" style={{ margin: "var(--sp-2) 0" }}>
                <AlertTriangle size={14} /> {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={<UserPlus size={16} />}
              disabled={loading}
              style={{ marginTop: "var(--sp-3)" }}
            >
              {loading ? "Creating account…" : "Register & Sign Up"}
            </Button>
          </form>

          <p className="auth-page__switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

