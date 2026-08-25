import { useEffect, useRef, useState } from "react";
import MessageList, { type ChatMessage } from "./MessageList";
import type { ChatApiResponse } from "@/lib/chat-types";
import { chatApiUrl } from "@/lib/chat-api";

// Taken from the seeded chat_logs rows in Shalinthia's reference dataset --
// real questions this store's customers actually asked.
const SUGGESTED_QUESTIONS = [
  "Do you have Midnight at Archer Pier?",
  "What time do you close Sunday?",
  "Any gifts under $10?",
];

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId] = useState<string>(() => makeSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch(chatApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, session_id: sessionId, history }),
      });
      const data: ChatApiResponse = await res.json();

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "Sorry, something went wrong on our end.",
        cards: data.cards,
        sample: data.sample,
        handoff: data.handoff,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I couldn't reach the store's system just now. Please try again shortly.",
          handoff: true,
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  if (!open) {
    return (
      <button className="rb-launcher" onClick={() => setOpen(true)} aria-label="Open chat">
        💬
      </button>
    );
  }

  return (
    <div className="rb-panel">
      <div className="rb-header">
        <span>Riverside Books & Gifts</span>
        <button onClick={() => setOpen(false)} aria-label="Close chat">
          ×
        </button>
      </div>

      <MessageList messages={messages} sessionId={sessionId} typing={typing} />
      <div ref={messagesEndRef} />

      {messages.length === 0 && (
        <div className="rb-chips">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} className="rb-chip" onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="rb-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a book, hours, or an event…"
          aria-label="Chat message"
        />
        <button type="submit" disabled={typing || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
