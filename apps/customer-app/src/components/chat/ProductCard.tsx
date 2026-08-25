import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CatalogItem } from "@/lib/chat-types";
import { stockBand } from "@/lib/chat-types";
import { chatApiUrl } from "@/lib/chat-api";
import SamplePanel from "./SamplePanel";

interface ProductCardProps {
  item: CatalogItem;
  sessionId: string;
  /** Non-null only when this is the single confident book match for the turn. */
  sampleInfo?: { available: boolean; book_id: number | null } | null;
}

async function recordSampleEvent(
  sessionId: string,
  bookId: number,
  action: "opened" | "reserve_clicked" | "dismissed",
) {
  try {
    await fetch(chatApiUrl("/api/sample/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, book_id: bookId, action }),
    });
  } catch {
    // Best-effort telemetry -- never block the UI on it.
  }
}

export default function ProductCard({ item, sessionId, sampleInfo }: ProductCardProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const navigate = useNavigate();
  const isFocusedBook =
    item.product_type === "book" && sampleInfo != null && sampleInfo.book_id === item.id;

  const handleToggleSample = () => {
    const next = !panelOpen;
    setPanelOpen(next);
    if (next) recordSampleEvent(sessionId, item.id, "opened");
    else recordSampleEvent(sessionId, item.id, "dismissed");
  };

  // Unlike the standalone chatbot deploy (which deep-links to an external
  // "Product A"), this widget runs *inside* Product A (this app) -- reserving
  // is already native here via each book's own pre-order form. The chat's
  // compat-database ids aren't yet mapped back to this app's real book UUIDs
  // (see CLAUDE.md's compat-DB plan), so for now "Reserve" sends the customer
  // to the catalog to find the title themselves rather than guess a broken
  // link. Swap for a real `/books/${realBookId}` deep link once that mapping
  // is exposed.
  const handleReserve = () => {
    if (item.product_type === "book") {
      recordSampleEvent(sessionId, item.id, "reserve_clicked");
    }
    navigate("/catalog");
  };

  const band = stockBand(item.stock_level);
  const bandText =
    band === "in_stock"
      ? "In stock"
      : band === "low_stock"
        ? `Low stock — ${item.stock_level} listed`
        : "Out of stock";

  return (
    <div>
      <div className="rb-card">
        <div className="rb-card-cover" aria-hidden="true" />
        <div className="rb-card-body">
          <p className="rb-card-title">{item.name}</p>
          {item.author && <p className="rb-card-author">{item.author}</p>}
          <p className="rb-card-price">${item.price.toFixed(2)}</p>
          <span className={`rb-stock ${band}`}>{bandText}</span>
          <div className="rb-card-actions">
            {isFocusedBook && (
              <button className="rb-btn" onClick={handleToggleSample}>
                {panelOpen ? "Hide sample" : "Read a sample"}
              </button>
            )}
            <button className="rb-btn primary" onClick={handleReserve}>
              Reserve for pickup
            </button>
          </div>
        </div>
      </div>
      {isFocusedBook && panelOpen && (
        <SamplePanel
          bookId={item.id}
          fallbackDescription={item.description}
          sessionId={sessionId}
          onReserve={handleReserve}
        />
      )}
    </div>
  );
}
