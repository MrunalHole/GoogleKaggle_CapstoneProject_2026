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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const token = await signup(email, password);
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
      <div className="container">
        <div className="card auth-card">
          <div className="page-head" style={{ paddingTop: 0 }}>
            <span className="eyebrow">Create an account</span>
            <h1>Sign up</h1>
            <p>Create an account to save your screening history across visits.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="auth-form__hint">At least 8 characters</span>
            </label>

            {error && (
              <p className="auth-form__error">
                <AlertTriangle size={14} /> {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={<UserPlus size={16} />}
              disabled={loading}
            >
              {loading ? "Creating account…" : "Sign up"}
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
