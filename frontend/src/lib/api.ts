/**
 * API client for the Parkinson's screening backend.
 *
 * This talks to whatever endpoint your model/agent is served from
 * (e.g. the Vertex AI Agent Engine deployment, or a local FastAPI/Flask
 * wrapper around the trained scikit-learn model during development).
 *
 * Set VITE_API_BASE_URL in a .env file to point at your real backend.
 * Until that's wired up, calls fall back to a clearly-labeled mock
 * response so the UI is fully clickable/demoable without a backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_MOCK = !API_BASE_URL;

export interface VoiceFeatureScores {
  feature: string;
  importance: number;
}

export interface ScreeningResult {
  /** 0–1 probability-style score, NOT a diagnosis */
  riskScore: number;
  label: "low-likelihood" | "moderate-likelihood" | "elevated-likelihood";
  modelUsed: "random_forest" | "svm" | "ensemble";
  topFeatures: VoiceFeatureScores[];
  confidence: number;
  disclaimer: string;
}

export interface SymptomEntry {
  id: string;
  date: string; // ISO date
  tremor: number; // 0-10
  stiffness: number; // 0-10
  balance: number; // 0-10
  mood: number; // 0-10
  sleepQuality: number; // 0-10
  notes?: string;
}

export interface MedicationReminder {
  id: string;
  name: string;
  dosage: string;
  times: string[]; // ["08:00", "14:00", "20:00"]
  taken: Record<string, boolean>; // keyed by `${date}_${time}`
}

const STANDARD_DISCLAIMER =
  "This is a screening aid built on a small research dataset. It is not a medical diagnosis. Please discuss any results with a neurologist or your primary care provider.";

function mockDelay<T>(value: T, ms = 1400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function pseudoRandomFromBlob(size: number): number {
  // Deterministic-ish pseudo-randomness for demo purposes only.
  const seed = (size % 97) / 97;
  return Math.min(0.95, Math.max(0.04, seed));
}

export async function submitVoiceClip(
  audioBlob: Blob
): Promise<ScreeningResult> {
  if (USE_MOCK) {
    const score = pseudoRandomFromBlob(audioBlob.size);
    return mockDelay(buildMockResult(score, "svm"));
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, "clip.webm");

  const res = await fetch(`${API_BASE_URL}/screen/voice`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Voice screening failed (${res.status})`);
  return res.json();
}

export async function submitCsvFeatures(
  file: File
): Promise<ScreeningResult> {
  if (USE_MOCK) {
    const score = pseudoRandomFromBlob(file.size);
    return mockDelay(buildMockResult(score, "random_forest"));
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/screen/csv`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`CSV screening failed (${res.status})`);
  return res.json();
}

export interface ScreeningSession {
  session_id: string;
  date: string;
  risk_score: number;
  label: string;
  model_used: string;
  confidence: number;
  clinical_explanation: string;
}

/** Returns [] in demo mode since there's no backend to log sessions against. */
export async function getScreeningSessions(): Promise<ScreeningSession[]> {
  if (USE_MOCK) return [];

  const res = await fetch(`${API_BASE_URL}/sessions?limit=20`);
  if (!res.ok) throw new Error(`Fetching session history failed (${res.status})`);
  return res.json();
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MOCK_ASSISTANT_REPLY =
  "This is a demo response — connect VITE_API_BASE_URL to a running backend to chat with the real assistant.";

export async function submitAssistantMessage(
  history: ChatMessage[]
): Promise<string> {
  if (USE_MOCK) {
    return mockDelay(MOCK_ASSISTANT_REPLY, 900);
  }

  const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });
  if (!res.ok) throw new Error(`Assistant chat failed (${res.status})`);
  const data = await res.json();
  return data.reply;
}

export async function submitAttachment(
  file: File
): Promise<{ id: string; filename: string; status: "received" }> {
  if (USE_MOCK) {
    return mockDelay({ id: crypto.randomUUID(), filename: file.name, status: "received" as const }, 700);
  }
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/attachments`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.json();
}

function buildMockResult(
  score: number,
  modelUsed: ScreeningResult["modelUsed"]
): ScreeningResult {
  const label: ScreeningResult["label"] =
    score < 0.4
      ? "low-likelihood"
      : score < 0.7
      ? "moderate-likelihood"
      : "elevated-likelihood";

  return {
    riskScore: score,
    label,
    modelUsed,
    confidence: 0.7 + score * 0.1,
    topFeatures: [
      { feature: "PPE (pitch period entropy)", importance: 0.15 },
      { feature: "spread1", importance: 0.11 },
      { feature: "MDVP:Fo(Hz)", importance: 0.08 },
      { feature: "MDVP:Flo(Hz)", importance: 0.06 },
      { feature: "MDVP:Fhi(Hz)", importance: 0.06 },
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export const isMockMode = USE_MOCK;
