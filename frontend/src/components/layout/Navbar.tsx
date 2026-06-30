import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Brain } from "lucide-react";
import AccessibilityMenu from "../ui/AccessibilityMenu";
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        </nav>
      )}
    </header>
  );
}
