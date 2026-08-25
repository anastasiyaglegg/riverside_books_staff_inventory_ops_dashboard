import type { CatalogItem } from "@/lib/chat-types";
import ProductCard from "./ProductCard";
import HandoffCard from "./HandoffCard";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: CatalogItem[];
  sample?: { available: boolean; book_id: number | null } | null;
  handoff?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
  sessionId: string;
  typing: boolean;
}

export default function MessageList({ messages, sessionId, typing }: MessageListProps) {
  return (
    <div className="rb-messages">
      {messages.map((m) => (
        <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className={`rb-bubble ${m.role}`}>{m.content}</div>
          {m.role === "assistant" && m.cards && m.cards.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {m.cards.map((item) => (
                <ProductCard
                  key={`${item.product_type}-${item.id}`}
                  item={item}
                  sessionId={sessionId}
                  sampleInfo={m.sample}
                />
              ))}
            </div>
          )}
          {m.role === "assistant" && m.handoff && (!m.cards || m.cards.length === 0) && (
            <HandoffCard />
          )}
        </div>
      ))}
      {typing && <div className="rb-typing">Riverside Books is typing…</div>}
    </div>
  );
}
