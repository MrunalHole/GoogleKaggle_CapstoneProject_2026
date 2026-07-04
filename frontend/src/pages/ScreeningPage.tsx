import { useState, useCallback } from "react";
import { Mic, FileSpreadsheet, Paperclip, AlertTriangle, Loader2 } from "lucide-react";
import AudioRecorder from "../components/upload/AudioRecorder";
import Dropzone from "../components/upload/Dropzone";
import Button from "../components/ui/Button";
import {
  submitVoiceClip,
  submitCsvFeatures,
  submitAttachment,
  type ScreeningResult,
} from "../lib/api";
import "./ScreeningPage.css";

type Tab = "voice" | "csv" | "attachments";

export default function ScreeningPage() {
  const [tab, setTab] = useState<Tab>("voice");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScreening = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: ScreeningResult;
      if (tab === "voice" && voiceBlob) {
        res = await submitVoiceClip(voiceBlob);
      } else if (tab === "csv" && csvFile) {
        res = await submitCsvFeatures(csvFile);
      } else {
        throw new Error("Add a voice clip or CSV file first.");
      }
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tab, voiceBlob, csvFile]);

  const handleAttachment = useCallback(async (file: File) => {
    setAttachments((prev) => [...prev, file]);
    try {
      await submitAttachment(file);
    } catch {
      // Non-blocking: attachments are supplementary, surfaced inline below.
    }
  }, []);

  const canRun =
    (tab === "voice" && !!voiceBlob) || (tab === "csv" && !!csvFile);

  return (
    <div className="screening">
      <div className="container">
        <div className="page-head">
          <span className="eyebrow">Educational screening tool</span>
          <h1>See what a voice-based model picks up on</h1>
          <p>
            Record a sustained "aaah" sound, or upload a voice clip or a CSV
            of vocal measurements. A model trained on acoustic biomarkers
            will estimate a likelihood score — purely for learning how this
            kind of screening works.
          </p>
        </div>

        <div className="screening-layout">
          <div className="card screening-input">
            <div className="screening-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "voice"}
                className={`screening-tab ${tab === "voice" ? "screening-tab--active" : ""}`}
                onClick={() => setTab("voice")}
              >
                <Mic size={16} /> Record voice
              </button>
              <button
                role="tab"
                aria-selected={tab === "csv"}
                className={`screening-tab ${tab === "csv" ? "screening-tab--active" : ""}`}
                onClick={() => setTab("csv")}
              >
                <FileSpreadsheet size={16} /> Upload CSV
              </button>
              <button
                role="tab"
                aria-selected={tab === "attachments"}
                className={`screening-tab ${tab === "attachments" ? "screening-tab--active" : ""}`}
                onClick={() => setTab("attachments")}
              >
                <Paperclip size={16} /> Attachments
              </button>
            </div>

            <div className="screening-tab-panel">
              {tab === "voice" && <AudioRecorder onClipReady={setVoiceBlob} />}

              {tab === "csv" && (
                <>
                  <Dropzone
                    accept=".csv"
                    label="Upload a CSV of vocal measurements"
                    hint="Expects columns like MDVP:Fo(Hz), Jitter, Shimmer, HNR, PPE — same format as the UCI Parkinson's dataset"
                    icon={<FileSpreadsheet size={22} />}
                    onFileSelected={setCsvFile}
                    selectedFileName={csvFile?.name ?? null}
                    onClear={() => setCsvFile(null)}
                  />
                </>
              )}

              {tab === "attachments" && (
                <div className="screening-attachments">
                  <Dropzone
                    accept=".pdf,.jpg,.jpeg,.png,.docx,.txt"
                    label="Add supporting documents"
                    hint="Clinical notes, prior test results, or other relevant files (optional)"
                    icon={<Paperclip size={22} />}
                    onFileSelected={handleAttachment}
                  />
                  {attachments.length > 0 && (
                    <ul className="screening-attachments__list">
                      {attachments.map((f, i) => (
                        <li key={i}>
                          <Paperclip size={14} /> {f.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {tab !== "attachments" && (
              <Button
                variant="primary"
                size="lg"
                disabled={!canRun || loading}
                onClick={runScreening}
                icon={loading ? <Loader2 size={18} className="spin" /> : undefined}
              >
                {loading ? "Analyzing voice patterns…" : "Run screening"}
              </Button>
            )}

            {error && <p className="screening-error">{error}</p>}
          </div>

          <div className="screening-result">
            {!result && !loading && (
              <div className="card screening-result__empty">
                <p>Your results will appear here once you run a screening.</p>
              </div>
            )}

            {loading && (
              <div className="card screening-result__empty">
                <Loader2 size={28} className="spin" />
                <p>Running the model — this takes a few seconds.</p>
              </div>
            )}

            {result && !loading && <ResultCard result={result} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: ScreeningResult }) {
  const pct = Math.round(result.riskScore * 100);
  const tagVariant =
    result.label === "low-likelihood"
      ? "success"
      : result.label === "moderate-likelihood"
      ? "warning"
      : "danger";
  const labelText =
    result.label === "low-likelihood"
      ? "Low likelihood signal"
      : result.label === "moderate-likelihood"
      ? "Moderate likelihood signal"
      : "Elevated likelihood signal";

  return (
    <div className="card screening-result__card">
      <span className={`tag tag--${tagVariant}`}>{labelText}</span>
      <div className="screening-result__score">
        <span className="screening-result__score-num">{pct}%</span>
        <span className="screening-result__score-label">model score</span>
      </div>
      <div className="score-bar">
        <div
          className="score-bar__fill"
          style={{
            width: `${pct}%`,
            background:
              tagVariant === "success"
                ? "var(--color-success)"
                : tagVariant === "warning"
                ? "var(--color-warning)"
                : "var(--color-danger)",
          }}
        />
      </div>

      <p className="screening-result__model">
        Model used: <strong>{result.modelUsed.replace("_", " ")}</strong> · Confidence ~{Math.round(result.confidence * 100)}%
      </p>

      <div className="screening-result__features">
        <p className="explore-panel__label">Top contributing voice features</p>
        <ul>
          {result.topFeatures.map((f) => (
            <li key={f.feature}>
              <span>{f.feature}</span>
              <span className="screening-result__feature-bar">
                <span style={{ width: `${Math.min(100, f.importance * 500)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="disclaimer">
        <AlertTriangle size={18} />
        <p>{result.disclaimer}</p>
      </div>
    </div>
  );
}
