import { useState, useRef, useEffect } from "react";
import { Accessibility, Mic } from "lucide-react";
import { useAccessibilityStore } from "../../store/useAppStore";
import "./AccessibilityMenu.css";

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const {
    highContrast,
    largeText,
    reduceMotion,
    voiceNavEnabled,
    toggleHighContrast,
    toggleLargeText,
    toggleReduceMotion,
    toggleVoiceNav,
  } = useAccessibilityStore();

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? "high" : "normal";
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.dataset.textSize = largeText ? "large" : "normal";
  }, [largeText]);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div className="a11y-menu" ref={ref}>
      <button
        className="a11y-menu__trigger"
        aria-label="Accessibility settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Accessibility size={20} />
      </button>

      {open && (
        <div className="a11y-menu__panel" role="menu">
          <p className="a11y-menu__title">Accessibility</p>

          <label className="a11y-menu__row">
            <span>High contrast</span>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={toggleHighContrast}
            />
          </label>

          <label className="a11y-menu__row">
            <span>Large text</span>
            <input
              type="checkbox"
              checked={largeText}
              onChange={toggleLargeText}
            />
          </label>

          <label className="a11y-menu__row">
            <span>Reduce motion</span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={toggleReduceMotion}
            />
          </label>

          <label className="a11y-menu__row">
            <span className="a11y-menu__row-label">
              <Mic size={14} /> Voice navigation
            </span>
            <input
              type="checkbox"
              checked={voiceNavEnabled}
              onChange={toggleVoiceNav}
            />
          </label>
          {voiceNavEnabled && (
            <p className="a11y-menu__hint">
              Say "go to dashboard", "go to screening", or "go home" on any page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
