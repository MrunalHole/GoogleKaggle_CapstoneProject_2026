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
  clearDashboard: () => void;
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
      clearDashboard: () => set({ symptomEntries: [], medications: [] }),
    }),
    {
      // Default key covers the anonymous / pre-login case.
      // Immediately overwritten with a user-scoped key once the user is identified
      // (see mountDashboardForUser below), ensuring each user's data is isolated.
      name: "lucent-dashboard",
    }
  )
);

/**
 * Switches the dashboard store's persisted localStorage key to a user-scoped
 * partition (e.g. "lucent-dashboard-abc123") so that symptom entries and
 * medications are never shared between different logged-in users.
 */
function mountDashboardForUser(userId: string) {
  useDashboardStore.persist.setOptions({ name: `lucent-dashboard-${userId}` });
  useDashboardStore.persist.rehydrate();
}

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
      mountDashboardForUser(user.id);
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
      mountDashboardForUser(user.id);
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
    // Reset the in-memory dashboard state so the next user (or the anonymous
    // view) never sees the previous user's symptom entries or medications.
    useDashboardStore.getState().clearDashboard();
    // Revert the storage key back to the generic default.
    useDashboardStore.persist.setOptions({ name: "lucent-dashboard" });
    set({ user: null, status: "anonymous" });
  },
}));
