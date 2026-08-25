"use client";

import { useEffect, useRef, useState } from "react";
import MessageList, { type ChatMessage } from "./MessageList";
import type { ChatApiResponse } from "@/lib/types";

// Taken from the seeded chat_logs rows (see reference dataset) — real
// questions this store's customers actually asked.
const SUGGESTED_QUESTIONS = [
  "Do you have Midnight at Archer Pier?",
  "What time do you close Sunday?",
  "Any gifts under $10?",
];

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// The API route the widget talks to. Empty string resolves to a same-origin
// "/api/chat", identical to today's behavior. Set NEXT_PUBLIC_CHAT_API_BASE_URL
// when this bundle is embedded on a host page served from a different origin
// than the one hosting /api/chat (see README "Embedding on another site").
const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || "";

// Simplified badge version of the storefront logo — moon, string lights, and
// a book-and-mug stack in the brand navy/blush/gold palette — used in place
// of a generic emoji so the launcher reads as Riverside Books at a glance.
function LauncherMark() {
  return (
    <svg viewBox="0 0 56 56" width="30" height="30" role="img" aria-hidden="true">
      <circle cx="28" cy="28" r="27" fill="#1c2b4a" />
      <path
        d="M40 14a9 9 0 1 0 3.2 15.8A11 11 0 0 1 40 14Z"
        fill="#e8c065"
      />
      <circle cx="14" cy="15" r="1.1" fill="#f3e2c7" />
      <circle cx="19" cy="11" r="0.9" fill="#f3e2c7" />
      <circle cx="10" cy="20" r="0.8" fill="#f3e2c7" />
      <rect x="15" y="33" width="15" height="6" rx="1" fill="#c96a5b" />
      <rect x="16.5" y="27" width="12" height="6" rx="1" fill="#3f5d43" />
      <rect x="15" y="21" width="15" height="6" rx="1" fill="#e8c065" />
      <path
        d="M33 34a5 5 0 0 0 5 5h1v-9.5a1.5 1.5 0 0 1 1.5-1.5H41a3 3 0 0 1 0 6h-.6"
        fill="none"
        stroke="#f3e2c7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M36.5 30.5c1 1.3 1 2.7 0 4"
        fill="none"
        stroke="#1c2b4a"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M21 43c1.6-1.8 4.4-1.8 6 0"
        fill="none"
        stroke="#e39a9a"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ChatWidget() {
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
      const res = await fetch(`${CHAT_API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, session_id: sessionId, history }),
      });
      const data: ChatApiResponse = await res.json();
      // The 'shown' sample_preview_events row is recorded server-side in
      // /api/chat (see app/api/chat/route.ts) so it's guaranteed even if
      // this client never mounts — no client-side duplicate needed here.

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
        <LauncherMark />
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
          sendMessage(input);
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
