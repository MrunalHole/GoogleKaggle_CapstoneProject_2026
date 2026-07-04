import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, AlertTriangle } from "lucide-react";
import { login } from "../lib/api";
import { useAuthStore } from "../store/useAppStore";
import Button from "../components/ui/Button";
import "./AuthPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      await setSession(token);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="container">
        <div className="card auth-card">
          <div className="page-head" style={{ paddingTop: 0 }}>
            <span className="eyebrow">Welcome back</span>
            <h1>Log in</h1>
            <p>Log in to see your past screening sessions.</p>
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
              icon={<LogIn size={16} />}
              disabled={loading}
            >
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="auth-page__switch">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
