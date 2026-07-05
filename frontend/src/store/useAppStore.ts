import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SymptomEntry, MedicationReminder, AuthUser } from "../lib/api";
import { getToken, setToken, clearToken, getMe, AuthError } from "../lib/api";

interface AccessibilityState {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  voiceNavEnabled: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleReduceMotion: () => void;
  toggleVoiceNav: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      highContrast: false,
      largeText: false,
      reduceMotion: false,
      voiceNavEnabled: false,
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleLargeText: () => set((s) => ({ largeText: !s.largeText })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      toggleVoiceNav: () => set((s) => ({ voiceNavEnabled: !s.voiceNavEnabled })),
    }),
    { name: "lucent-accessibility" }
  )
);

interface DashboardState {
  symptomEntries: SymptomEntry[];
  medications: MedicationReminder[];
  addSymptomEntry: (entry: Omit<SymptomEntry, "id">) => void;
  removeSymptomEntry: (id: string) => void;
  addMedication: (med: Omit<MedicationReminder, "id" | "taken">) => void;
  removeMedication: (id: string) => void;
  toggleDose: (medId: string, doseKey: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      symptomEntries: [],
      medications: [],
      addSymptomEntry: (entry) =>
        set((s) => ({
          symptomEntries: [
            { ...entry, id: crypto.randomUUID() },
            ...s.symptomEntries,
          ].sort((a, b) => b.date.localeCompare(a.date)),
        })),
      removeSymptomEntry: (id) =>
        set((s) => ({
          symptomEntries: s.symptomEntries.filter((e) => e.id !== id),
        })),
      addMedication: (med) =>
        set((s) => ({
          medications: [
            ...s.medications,
            { ...med, id: crypto.randomUUID(), taken: {} },
          ],
        })),
      removeMedication: (id) =>
        set((s) => ({
          medications: s.medications.filter((m) => m.id !== id),
        })),
      toggleDose: (medId, doseKey) =>
        set((s) => ({
          medications: s.medications.map((m) =>
            m.id === medId
              ? { ...m, taken: { ...m.taken, [doseKey]: !m.taken[doseKey] } }
              : m
          ),
        })),
    }),
    { name: "lucent-dashboard" }
  )
);

interface AuthState {
  user: AuthUser | null;
  // "unreachable": a token exists and hasn't been rejected, but the most
  // recent verification attempt failed for some other reason (network
  // error, misconfigured API URL, 5xx, etc). The token is deliberately
  // left alone in this state -- only a real 401/403 means it's invalid.
  status: "checking" | "authenticated" | "anonymous" | "unreachable";
  setSession: (token: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  logout: () => void;
}

// True only for a genuine "this token is invalid" response. Network errors
// throw a plain TypeError, and a misconfigured API_BASE_URL hitting Vite's
// own dev server throws a SyntaxError trying to parse its HTML as JSON --
// neither means the token itself is bad, so neither should log anyone out.
function isInvalidTokenError(err: unknown): boolean {
  return err instanceof AuthError && (err.status === 401 || err.status === 403);
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "checking",

  // Called right after signup/login: we already have a fresh token, so trust
  // it once to populate the user, rather than re-fetching immediately.
  setSession: async (token) => {
    setToken(token);
    try {
      const user = await getMe();
      set({ user, status: "authenticated" });
    } catch (err) {
      if (isInvalidTokenError(err)) clearToken();
      set({ user: null, status: "anonymous" });
      throw new Error("Could not verify the new session.");
    }
  },

  // Called on app load: a token in localStorage is never trusted blindly --
  // it's re-validated against GET /auth/me, since it may have expired or
  // been revoked since the last visit.
  checkAuth: async () => {
    if (!getToken()) {
      set({ user: null, status: "anonymous" });
      return;
    }
    try {
      const user = await getMe();
      set({ user, status: "authenticated" });
    } catch (err) {
      if (isInvalidTokenError(err)) {
        clearToken();
        set({ user: null, status: "anonymous" });
      } else {
        // Leave the token in place -- this isn't evidence it's invalid,
        // just that we couldn't check right now.
        set((s) => ({ ...s, status: "unreachable" }));
      }
    }
  },

  logout: () => {
    clearToken();
    set({ user: null, status: "anonymous" });
  },
}));
