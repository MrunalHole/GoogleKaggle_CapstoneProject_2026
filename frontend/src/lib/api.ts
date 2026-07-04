/**
 * API client for the Parkinson's screening backend.
 *
 * Set VITE_API_BASE_URL in a .env file to point at your backend
 * (see backend/README.md).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

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

export async function submitVoiceClip(
  audioBlob: Blob
): Promise<ScreeningResult> {
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

export async function getScreeningSessions(): Promise<ScreeningSession[]> {
  const res = await fetch(`${API_BASE_URL}/sessions?limit=20`);
  if (!res.ok) throw new Error(`Fetching session history failed (${res.status})`);
  return res.json();
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function submitAssistantMessage(
  history: ChatMessage[]
): Promise<string> {
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
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/attachments`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.json();
}
