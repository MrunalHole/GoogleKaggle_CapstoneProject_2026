import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAccessibilityStore } from "../store/useAppStore";

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const ROUTES: Record<string, string> = {
  home: "/",
  "go home": "/",
  explore: "/explore",
  brain: "/explore",
  simulator: "/simulator",
  stage: "/simulator",
  screening: "/screening",
  voice: "/screening",
  dashboard: "/dashboard",
  treatments: "/treatments",
  assistant: "/assistant",
  about: "/about",
};

function resolveCommand(transcript: string): string | null {
  const t = transcript.toLowerCase().trim();
  for (const [key, path] of Object.entries(ROUTES)) {
    if (t.includes(key)) return path;
  }
  return null;
}

/**
 * Lightweight voice navigation: listens for phrases like
 * "go to dashboard" and routes the user there. Uses the browser's
 * native SpeechRecognition API — gracefully no-ops in browsers that
 * don't support it (e.g. Firefox).
 */
export function useVoiceNavigation() {
  const { voiceNavEnabled } = useAccessibilityStore();
  const navigate = useNavigate();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (!voiceNavEnabled) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Voice navigation: SpeechRecognition not supported in this browser.");
      return;
    }

    const recognition: SpeechRecognitionInstance = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      const path = resolveCommand(transcript);
      if (path) navigate(path);
    };

    recognition.onerror = () => {
      // Swallow errors (e.g. no-speech timeouts); restart on end instead.
    };

    recognition.onend = () => {
      if (voiceNavEnabled) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    try {
      recognition.start();
    } catch {
      /* ignore */
    }
    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.abort();
    };
  }, [voiceNavEnabled, navigate]);
}
