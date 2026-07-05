/**
 * API client for the Parkinson's screening backend.
 *
 * Set VITE_API_BASE_URL in a .env file to point at your backend
 * (see backend/README.md).
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const TOKEN_STORAGE_KEY = "lucent_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
    headers: authHeaders(),
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
    headers: authHeaders(),
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
  voice_file_path?: string;
  voice_url?: string;
  features?: Record<string, number>;
  clinical_explanation: string;
}

export async function getScreeningSessions(): Promise<ScreeningSession[]> {
  const res = await fetch(`${API_BASE_URL}/sessions?limit=20`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Fetching session history failed (${res.status})`);
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

/**
 * Thrown by getMe() when the backend actually answered with a non-2xx
 * status, carrying that status. Distinguishes "the token is genuinely
 * invalid" (401/403) from everything else -- a network failure or a
 * misconfigured API_BASE_URL throws a plain TypeError/SyntaxError instead,
 * never this, so callers can tell them apart.
 */
export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

async function parseAuthError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new Error(body?.detail ?? fallback);
}

export async function signup(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return parseAuthError(res, "Signup failed.");
  const data = await res.json();
  return data.access_token;
}

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return parseAuthError(res, "Login failed.");
  const data = await res.json();
  return data.access_token;
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new AuthError(res.status, `Not authenticated (${res.status})`);
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
