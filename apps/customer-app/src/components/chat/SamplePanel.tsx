import { useEffect, useRef, useState } from "react";
import type { BookSample } from "@/lib/chat-types";
import { chatApiUrl } from "@/lib/chat-api";
import HandoffCard from "./HandoffCard";

interface SamplePanelProps {
  bookId: number;
  fallbackDescription: string | null;
  sessionId: string;
  onReserve: () => void;
}

async function recordEvent(sessionId: string, bookId: number, action: "completed") {
  try {
    await fetch(chatApiUrl("/api/sample/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, book_id: bookId, action }),
    });
  } catch {
    // Best-effort telemetry.
  }
}

export default function SamplePanel({
  bookId,
  fallbackDescription,
  sessionId,
  onReserve,
}: SamplePanelProps) {
  const [sample, setSample] = useState<BookSample | null | undefined>(undefined); // undefined = loading
  const [completedFired, setCompletedFired] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(chatApiUrl(`/api/sample/${bookId}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setSample(data);
      })
      .catch(() => {
        if (!cancelled) setSample(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (!sentinelRef.current || completedFired) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCompletedFired(true);
          recordEvent(sessionId, bookId, "completed");
        }
      },
      { threshold: 1.0 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sample, completedFired, sessionId, bookId]);

  return (
    <div className="rb-sample-panel">
      <div className="rb-sample-body">
        {sample === undefined && <p>Loading preview…</p>}

        {sample === null && (
          <>
            <p>A preview isn&apos;t available for this title yet.</p>
            {fallbackDescription && <p>{fallbackDescription}</p>}
          </>
        )}

        {sample && sample.sample_type === "publisher_preview_url" && sample.preview_url && (
          <>
            <p>This preview is hosted by the publisher.</p>
            <a href={sample.preview_url} target="_blank" rel="noopener noreferrer">
              Open the publisher preview
            </a>
          </>
        )}

        {sample &&
          (sample.sample_type === "licensed_excerpt" || sample.sample_type === "staff_teaser") &&
          sample.excerpt_text && (
            <>
              <p>{sample.excerpt_text}</p>
              {sample.sample_type === "staff_teaser" && (
                <p style={{ fontStyle: "italic", color: "#77705f" }}>
                  That&apos;s all that&apos;s available for this title right now.
                </p>
              )}
              <p className="rb-sample-credit">Source: {sample.rights_source}</p>
            </>
          )}

        <div ref={sentinelRef} />
      </div>
      {showHandoff && <HandoffCard />}
      <div className="rb-sample-cta">
        <button className="rb-btn primary" onClick={onReserve}>
          Reserve for pickup
        </button>
        <button className="rb-btn" onClick={() => setShowHandoff((v) => !v)}>
          Ask a bookseller
        </button>
      </div>
    </div>
  );
}
