import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { submitAssistantMessage, type ChatMessage } from "../lib/api";
import "./AssistantPage.css";

const SUGGESTED = [
  "What's the difference between Parkinson's and essential tremor?",
  "How does the voice screening tool actually work?",
  "What are early signs of Parkinson's?",
  "Is Parkinson's hereditary?",
];

async function askAssistant(history: ChatMessage[]): Promise<string> {
  try {
    return await submitAssistantMessage(history);
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
