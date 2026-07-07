import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft, Loader2, AlertTriangle, FileSpreadsheet, Paperclip } from "lucide-react";
import { getScreeningSession, getScreeningSessions, type ScreeningSession } from "../lib/api";
import { useDashboardStore, useAuthStore } from "../store/useAppStore";
import ReactMarkdown from "react-markdown";
import Button from "../components/ui/Button";

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ScreeningSession | null>(null);
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authUser = useAuthStore((s) => s.user);
  const { symptomEntries } = useDashboardStore();

  const isSummary = sessionId === "summary";

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    if (isSummary) {
      getScreeningSessions()
        .then((data) => {
          setSessions(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load summary session details.");
          setLoading(false);
        });
    } else {
      getScreeningSession(sessionId)
        .then((data) => {
          setSession(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load report session details.");
          setLoading(false);
        });
    }
  }, [sessionId, isSummary]);

  const handleDownloadCsv = () => {
    if (sessions.length === 0) return;

    // Gather all unique feature keys from all sessions to align CSV columns
    const allFeaturesKeysSet = new Set<string>();
    sessions.forEach((s) => {
      if (s.features) {
        Object.keys(s.features).forEach((k) => allFeaturesKeysSet.add(k));
      }
    });
    const featureKeys = Array.from(allFeaturesKeysSet).sort();

    const headers = [
      "Session ID",
      "Date",
      "Risk Score (%)",
      "Category",
      "Model Used",
      "Confidence (%)",
      ...featureKeys,
    ];

    const rows = sessions.map((s) => {
      const row = [
        s.session_id,
        new Date(s.date).toISOString(),
        Math.round(s.risk_score * 100),
        s.label,
        s.model_used,
        Math.round(s.confidence * 100),
      ];

      featureKeys.forEach((k) => {
        const val = s.features?.[k];
        row.push(val !== undefined ? String(val) : "");
      });

      return row;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lucent_parkinsons_sessions_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--sp-9) 0", minHeight: "60vh" }}>
        <Loader2 size={32} className="animate-spin text-primary" style={{ color: "var(--color-primary)", marginBottom: "var(--sp-3)" }} />
        <p style={{ color: "var(--color-body)" }}>Compiling clinical health report...</p>
      </div>
    );
  }

  if (error || (!session && !isSummary)) {
    return (
      <div className="container" style={{ padding: "var(--sp-9) 0", maxWidth: "600px" }}>
        <div className="card" style={{ border: "1px solid var(--color-danger-border)", padding: "var(--sp-5)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--color-danger)", marginBottom: "var(--sp-3)" }}>
            <AlertTriangle size={24} />
            <h2 style={{ margin: 0, fontSize: "var(--fs-lg)" }}>Failed to Load Report</h2>
          </div>
          <p style={{ color: "var(--color-body)", marginBottom: "var(--sp-4)" }}>{error || "Report details could not be found or you are not authorized to view it."}</p>
          <Link to="/dashboard">
            <Button variant="secondary" icon={<ArrowLeft size={16} />}>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = isSummary
    ? new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : session
    ? new Date(session.date).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="report-container" style={{ padding: "var(--sp-6) 0", background: "#fbf9f6", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            padding: 0 !important;
          }
          .report-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .report-container {
            background: #fff !important;
            padding: 0 !important;
          }
        }
        .report-card {
          background: #fff;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--sp-6);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        .report-section {
          margin-top: var(--sp-5);
          padding-top: var(--sp-4);
          border-top: 1px solid var(--color-border);
        }
        .report-section h3 {
          font-size: var(--fs-md);
          color: var(--color-heading);
          margin-bottom: var(--sp-3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-4);
          margin-bottom: var(--sp-4);
        }
        @media (max-width: 600px) {
          .meta-grid {
            grid-template-columns: 1fr;
            gap: var(--sp-3);
          }
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-size: var(--fs-xs);
          text-transform: uppercase;
          color: var(--color-body);
          margin-bottom: 2px;
          font-weight: 500;
        }
        .meta-value {
          font-size: var(--fs-sm);
          font-weight: 600;
          color: var(--color-heading);
        }
        .table-clinical {
          width: 100%;
          border-collapse: collapse;
          margin-top: var(--sp-3);
        }
        .table-clinical th, .table-clinical td {
          border: 1px solid var(--color-border);
          padding: var(--sp-2) var(--sp-3);
          font-size: var(--fs-sm);
          text-align: left;
        }
        .table-clinical th {
          background: #fbf9f6;
          color: var(--color-heading);
          font-weight: 600;
        }
      `}</style>

      <div className="container" style={{ maxWidth: "800px" }}>
        
        {/* Navigation & Control Row */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)", flexWrap: "wrap", gap: "var(--sp-2)" }}>
          <Link to="/dashboard">
            <Button variant="secondary" icon={<ArrowLeft size={16} />}>Back to Dashboard</Button>
          </Link>
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            {isSummary && (
              <Button variant="secondary" icon={<FileSpreadsheet size={16} />} onClick={handleDownloadCsv}>
                Download CSV Data
              </Button>
            )}
            <Button variant="primary" icon={<Printer size={16} />} onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {/* Clinical Report Sheet */}
        <div className="report-card">
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--sp-4)", paddingBottom: "var(--sp-4)" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                {isSummary ? "LUCENT CLINICAL SUMMARY REPORT" : "LUCENT CLINICAL REPORT"}
              </span>
              <h1 style={{ fontSize: "var(--fs-2xl)", margin: "4px 0" }}>
                {isSummary ? "Parkinson's Assessment History" : "Parkinson's Assessment"}
              </h1>
              <p style={{ color: "var(--color-body)", fontSize: "var(--fs-sm)", margin: 0 }}>
                {isSummary ? "Report Compiled: " : "Generated on: "}{formattedDate}
              </p>
            </div>
            {isSummary ? (
              <div style={{ display: "flex", gap: "var(--sp-3)", textAlign: "right" }}>
                <div style={{ padding: "8px 12px", background: "#fbf9f6", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-body)", textTransform: "uppercase", display: "block" }}>Total Sessions</span>
                  <span style={{ fontSize: "var(--fs-xl)", fontWeight: "bold", color: "var(--color-heading)" }}>
                    {sessions.length}
                  </span>
                </div>
                <div style={{ padding: "8px 12px", background: "#fbf9f6", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-body)", textTransform: "uppercase", display: "block" }}>Avg Risk Score</span>
                  <span style={{ fontSize: "var(--fs-xl)", fontWeight: "bold", color: "var(--color-primary)" }}>
                    {sessions.length > 0
                      ? `${Math.round((sessions.reduce((acc, s) => acc + s.risk_score, 0) / sessions.length) * 100)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            ) : session ? (
              <div style={{ textAlign: "right", minWidth: "150px" }}>
                <div style={{ padding: "8px 12px", background: "#fbf9f6", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-body)", textTransform: "uppercase", display: "block" }}>Risk Probability</span>
                  <span style={{ fontSize: "var(--fs-xl)", fontWeight: "bold", color: session.label === "low-likelihood" ? "var(--color-success)" : session.label === "moderate-likelihood" ? "var(--color-warning)" : "var(--color-danger)" }}>
                    {Math.round(session.risk_score * 100)}%
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Meta Information */}
          <div className="report-section" style={{ borderTop: "2px solid var(--color-heading)" }}>
            <h3>Patient & Clinic Metadata</h3>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Patient Email</span>
                <span className="meta-value">{authUser?.email || "Authenticated Patient"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Primary Care Doctor</span>
                <span className="meta-value">{authUser?.doctor_name || "Not Configured"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Doctor Contact Email</span>
                <span className="meta-value">{authUser?.doctor_contact || "Not Configured"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Emergency Alert Relative</span>
                <span className="meta-value">
                  {authUser?.relative_name ? `${authUser.relative_name} (${authUser.relative_relation})` : "Not Configured"}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Relative Alert Contact</span>
                <span className="meta-value">{authUser?.relative_contact || "Not Configured"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Patient Location</span>
                <span className="meta-value">{authUser?.user_location || "Not Configured"}</span>
              </div>
            </div>
          </div>

          {/* Screening Session Details / Summary History */}
          {isSummary ? (
            <>
              <div className="report-section">
                <h3>1. Acoustic Biomarker Screening History</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="table-clinical">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Risk Score</th>
                        <th>Indicator Status</th>
                        <th>Model Used</th>
                        <th>Confidence</th>
                        <th>Logged Inputs / Attachments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.session_id}>
                          <td>
                            {new Date(s.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td style={{ fontWeight: "bold", color: s.label === "low-likelihood" ? "var(--color-success)" : s.label === "moderate-likelihood" ? "var(--color-warning)" : "var(--color-danger)" }}>
                            {Math.round(s.risk_score * 100)}%
                          </td>
                          <td style={{ textTransform: "capitalize" }}>{s.label.replace("-", " ")}</td>
                          <td style={{ textTransform: "uppercase", fontSize: "12px" }}>{s.model_used.replace("_", " ")}</td>
                          <td>{Math.round(s.confidence * 100)}%</td>
                          <td style={{ fontSize: "12px", color: "var(--color-body)" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {s.voice_file_path && <span>🔊 Voice</span>}
                              {s.csv_file_path && <span>📊 CSV</span>}
                              {s.attachments && s.attachments.length > 0 && (
                                <span style={{ borderLeft: "1px solid #ccc", paddingLeft: "6px" }}>
                                  📎 {s.attachments.length} file{s.attachments.length > 1 ? "s" : ""}
                                </span>
                              )}
                              {!s.voice_file_path && !s.csv_file_path && (!s.attachments || s.attachments.length === 0) && <span>—</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="report-section">
                <h3>2. Side-by-Side Vocal Biomarkers Comparison</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="table-clinical">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Pitch Avg Fo (Hz)</th>
                        <th>Jitter (%)</th>
                        <th>Shimmer</th>
                        <th>HNR (dB)</th>
                        <th>RPDE</th>
                        <th>DFA</th>
                        <th>PPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => {
                        const f = s.features || {};
                        return (
                          <tr key={s.session_id}>
                            <td>
                              {new Date(s.date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td>{f['MDVP:Fo(Hz)'] !== undefined ? f['MDVP:Fo(Hz)'].toFixed(2) : "—"}</td>
                            <td>{f['MDVP:Jitter(%)'] !== undefined ? `${(f['MDVP:Jitter(%)'] * 100).toFixed(3)}%` : "—"}</td>
                            <td>{f['MDVP:Shimmer'] !== undefined ? f['MDVP:Shimmer'].toFixed(4) : "—"}</td>
                            <td>{f['HNR'] !== undefined ? f['HNR'].toFixed(2) : "—"}</td>
                            <td>{f['RPDE'] !== undefined ? f['RPDE'].toFixed(3) : "—"}</td>
                            <td>{f['DFA'] !== undefined ? f['DFA'].toFixed(3) : "—"}</td>
                            <td>{f['PPE'] !== undefined ? f['PPE'].toFixed(3) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : session ? (
            <>
              <div className="report-section">
                <h3>1. Acoustic Biomarker Screening Session</h3>
                <div className="meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Assessment Class</span>
                    <span className="meta-value" style={{ textTransform: "capitalize" }}>{session.label.replace("-", " ")}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Machine Learning Model</span>
                    <span className="meta-value" style={{ textTransform: "uppercase" }}>{session.model_used.replace("_", " ")}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Model Confidence</span>
                    <span className="meta-value">{Math.round(session.confidence * 100)}%</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Session ID Reference</span>
                    <span className="meta-value" style={{ fontSize: "11px", fontFamily: "monospace" }}>{session.session_id}</span>
                  </div>
                </div>

                {/* Audio / File References */}
                {(session.voice_file_path || session.csv_file_path || (session.attachments && session.attachments.length > 0)) && (
                  <div style={{ marginTop: "var(--sp-3)" }}>
                    <span className="meta-label">Clinical Attachments Reference</span>
                    <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", marginTop: "4px" }}>
                      {session.voice_file_path && (
                        <span style={{ fontSize: "var(--fs-xs)", padding: "4px 8px", background: "#f5f5f5", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          🔊 Audio Recording Logged
                        </span>
                      )}
                      {session.csv_file_path && (
                        <span style={{ fontSize: "var(--fs-xs)", padding: "4px 8px", background: "#f5f5f5", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <FileSpreadsheet size={12} /> CSV Feature Matrix Logged
                        </span>
                      )}
                      {session.attachments && session.attachments.map((att: any) => (
                        <span key={att.id} style={{ fontSize: "var(--fs-xs)", padding: "4px 8px", background: "#f5f5f5", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Paperclip size={12} /> {att.filename}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acoustic Biomarkers Table */}
                {session.features && Object.keys(session.features).length > 0 && (
                  <div style={{ marginTop: "var(--sp-4)" }}>
                    <h4 style={{ fontSize: "var(--fs-sm)", color: "var(--color-heading)", marginBottom: "4px" }}>Acoustic Feature Log:</h4>
                    <div style={{ overflowX: "auto" }}>
                      <table className="table-clinical">
                        <thead>
                          <tr>
                            <th>Biomarker Metric</th>
                            <th>Measured Value</th>
                            <th>Baseline Range (Typical)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(session.features).slice(0, 10).map(([name, val]) => (
                            <tr key={name}>
                              <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{name}</td>
                              <td>{typeof val === "number" ? val.toFixed(5) : val}</td>
                              <td>
                                {name.includes("Fo") ? "100 - 250 Hz" :
                                 name.includes("Jitter") ? "< 0.005 (0.5%)" :
                                 name.includes("Shimmer") ? "< 0.030 (3.0%)" :
                                 name.includes("HNR") ? "> 20.0 dB" : "Standard range"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Clinical Explanation */}
              <div className="report-section">
                <h3>2. Gemini Clinical Narrative Insights</h3>
                <div style={{ padding: "var(--sp-3) var(--sp-4)", background: "#fbf9f6", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: "var(--fs-sm)", color: "var(--color-body)", lineHeight: "1.6" }}>
                  <ReactMarkdown>{session.clinical_explanation}</ReactMarkdown>
                </div>
              </div>
            </>
          ) : null}

          {/* Daily Symptom Logs Section */}
          <div className="report-section">
            <h3>3. Patient Daily Symptom Logs (Recent Check-ins)</h3>
            <p className="auth-form__hint" style={{ marginBottom: "var(--sp-3)" }}>
              Self-reported symptom logs tracked in-browser over the last 14 days. These complement vocal screenings to map indicators over time.
            </p>
            {symptomEntries.length === 0 ? (
              <div style={{ padding: "var(--sp-3)", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)" }}>
                <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--color-body)" }}>No daily symptom logs recorded by patient in this browser.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table-clinical">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tremor (0-10)</th>
                      <th>Stiffness (0-10)</th>
                      <th>Balance (0-10)</th>
                      <th>Mood (0-10)</th>
                      <th>Sleep (0-10)</th>
                      <th>Notes / Clinical Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symptomEntries.slice(0, 14).map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td>{e.tremor}/10</td>
                        <td>{e.stiffness}/10</td>
                        <td>{e.balance}/10</td>
                        <td>{e.mood}/10</td>
                        <td>{e.sleepQuality}/10</td>
                        <td style={{ fontSize: "12px", color: "var(--color-body)" }}>{e.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Disclaimer */}
          <div className="report-section" style={{ borderTop: "1px solid var(--color-heading)", marginTop: "var(--sp-6)", paddingTop: "var(--sp-3)" }}>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-body)", lineHeight: "1.4", margin: 0, textAlign: "justify" }}>
              <b>Clinical Disclaimer:</b> This report is generated automatically based on patient vocal biometric analysis and self-reported daily symptom ratings. 
              The Parkinson's likelihood score represents an approximate machine learning probability metric and does not constitute a formal diagnosis. 
              Always consult a qualified medical professional for clinical decision-making.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
