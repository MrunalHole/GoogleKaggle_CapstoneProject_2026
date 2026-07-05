import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Brain, LogOut, AlertTriangle } from "lucide-react";
import AccessibilityMenu from "../ui/AccessibilityMenu";
import { useAuthStore } from "../../store/useAppStore";
import "./Navbar.css";

const links = [
  { to: "/explore", label: "Explore the Brain" },
  { to: "/simulator", label: "Stage Simulator" },
  { to: "/screening", label: "Voice Screening" },
  { to: "/dashboard", label: "My Dashboard" },
  { to: "/treatments", label: "Treatments" },
  { to: "/assistant", label: "Ask Lucent" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, status, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/");
  }

  return (
    <header className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}>
      <div className="container navbar__inner">
        <NavLink to="/" className="navbar__brand" onClick={() => setOpen(false)}>
          <Brain size={22} strokeWidth={1.6} />
          <span>Lucent</span>
        </NavLink>

        <nav className="navbar__links" aria-label="Primary">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `navbar__link ${isActive ? "navbar__link--active" : ""}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          {status === "authenticated" && user ? (
            <div className="navbar__auth">
              <span className="navbar__auth-email">{user.email}</span>
              <button className="navbar__auth-logout" onClick={handleLogout} aria-label="Log out">
                <LogOut size={15} />
              </button>
            </div>
          ) : status === "anonymous" ? (
            <NavLink to="/login" className="navbar__auth-login" onClick={() => setOpen(false)}>
              Log in
            </NavLink>
          ) : status === "unreachable" ? (
            <button
              className="navbar__auth-unreachable"
              onClick={() => checkAuth()}
              title="Couldn't verify your session, check your connection. Your login hasn't been cleared — click to retry."
            >
              <AlertTriangle size={14} /> Couldn't verify session
            </button>
          ) : null}
          <AccessibilityMenu />
          <button
            className="navbar__burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="navbar__mobile" aria-label="Primary mobile">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="navbar__mobile-link"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          {status === "authenticated" && user ? (
            <button className="navbar__mobile-link navbar__mobile-logout" onClick={handleLogout}>
              Log out ({user.email})
            </button>
          ) : status === "anonymous" ? (
            <NavLink to="/login" className="navbar__mobile-link" onClick={() => setOpen(false)}>
              Log in
            </NavLink>
          ) : status === "unreachable" ? (
            <button className="navbar__mobile-link navbar__mobile-logout" onClick={() => checkAuth()}>
              Couldn't verify session — retry
            </button>
          ) : null}
        </nav>
      )}
    </header>
  );
}
