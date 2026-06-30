import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import "./AssistantPage.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What's the difference between Parkinson's and essential tremor?",
  "How does the voice screening tool actually work?",
  "What are early signs of Parkinson's?",
  "Is Parkinson's hereditary?",
];

const SYSTEM_PROMPT = `You are Lucent's educational assistant, embedded in a Parkinson's disease
education platform. Answer clearly and accessibly. Always:
- Stay factual and avoid alarming language
- Make clear you are not providing medical diagnosis or advice
- Suggest consulting a neurologist for anything specific to the user's own health
- Keep answers concise (3-6 sentences) unless asked for more detail`;

/**
 * This calls the Anthropic API directly from the client for the demo.
 * In production, route this through your own backend (e.g. the
 * agents-cli/ADK agent already scaffolded in this repo) so the API key
 * stays server-side rather than exposed in the browser.
 */
async function askAssistant(history: ChatMessage[]): Promise<string> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await response.json();
    const text = data.content
      ?.map((block: { type: string; text?: string }) =>
        block.type === "text" ? block.text : ""
      )
      .filter(Boolean)
      .join("\n");
    return text || "I wasn't able to generate a response just now — please try again.";
  } catch {
    return "I'm having trouble connecting right now. This assistant needs a backend connection configured — check the README for setup.";
  }
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm here to help explain Parkinson's disease, the brain, or how this site's tools work. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const reply = await askAssistant(next);
    setMessages([...next, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  return (
    <div className="assistant">
      <div className="container assistant__container">
        <div className="page-head">
          <span className="eyebrow">Ask Lucent</span>
          <h1>Your guide to understanding Parkinson's</h1>
          <p>
            Ask about symptoms, the brain, treatments, or how the tools on
            this site work. This assistant explains — it doesn't diagnose.
          </p>
        </div>

        <div className="card assistant-window">
          <div className="assistant-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg assistant-msg--${m.role}`}>
                <span className="assistant-msg__avatar">
                  {m.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                </span>
                <p>{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className="assistant-msg assistant-msg--assistant">
                <span className="assistant-msg__avatar"><Bot size={16} /></span>
                <p className="assistant-msg__typing">
                  <span /><span /><span />
                </p>
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="assistant-suggestions">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => sendMessage(s)}>
                  <Sparkles size={13} /> {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="assistant-input"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about Parkinson's…"
              aria-label="Message"
            />
            <button type="submit" disabled={!input.trim() || loading} aria-label="Send">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
