"use client";

import { useState } from "react";
import type { CatalogItem } from "@/lib/types";
import { stockBand, stockBandLabel } from "@/lib/types";
import SamplePanel from "./SamplePanel";

interface ProductCardProps {
  item: CatalogItem;
  sessionId: string;
  /** Non-null only when this is the single confident book match for the turn. */
  sampleInfo?: { available: boolean; book_id: number | null } | null;
}

function buildReservationUrlClient(productType: string, productId: number): string {
  const base =
    process.env.NEXT_PUBLIC_PRODUCT_A_URL || "https://product-a.riversidebooks.example/reserve";
  const url = new URL(base);
  url.searchParams.set("product_type", productType);
  url.searchParams.set("product_id", String(productId));
  url.searchParams.set("source", "chatbot_sample");
  return url.toString();
}

async function recordSampleEvent(
  sessionId: string,
  bookId: number,
  action: "opened" | "reserve_clicked" | "dismissed"
) {
  try {
    await fetch("/api/sample/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, book_id: bookId, action }),
    });
  } catch {
    // Best-effort telemetry — never block the UI on it.
  }
}

export default function ProductCard({ item, sessionId, sampleInfo }: ProductCardProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const isFocusedBook =
    item.product_type === "book" && sampleInfo != null && sampleInfo.book_id === item.id;

  const handleToggleSample = () => {
    const next = !panelOpen;
    setPanelOpen(next);
    if (next) recordSampleEvent(sessionId, item.id, "opened");
    else recordSampleEvent(sessionId, item.id, "dismissed");
  };

  const handleReserve = () => {
    if (item.product_type === "book") {
      recordSampleEvent(sessionId, item.id, "reserve_clicked");
    }
    const url = buildReservationUrlClient(item.product_type, item.id);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const band = stockBand(item.stock_level);
  const bandText = band === "in_stock" ? "In stock" : band === "low_stock" ? `Low stock — ${item.stock_level} listed` : "Out of stock";

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
