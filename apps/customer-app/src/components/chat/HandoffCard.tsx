import { useEffect, useState } from "react";
import type { StoreInfoRow } from "@/lib/chat-types";
import { chatApiUrl } from "@/lib/chat-api";

export default function HandoffCard() {
  const [info, setInfo] = useState<StoreInfoRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(chatApiUrl("/api/store-info?category=contact,hours"))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setInfo(data.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setInfo([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const phone = info?.find((r) => r.key === "store_phone")?.value;
  const email = info?.find((r) => r.key === "store_email")?.value;
  const weekday = info?.find((r) => r.key === "weekday_hours")?.value;
  const weekend = info?.find((r) => r.key === "weekend_hours")?.value;

  return (
    <div className="rb-handoff">
      <h4>Talk to a bookseller</h4>
      {info === null && <p>Loading contact details…</p>}
      {phone && <p>Phone: {phone}</p>}
      {email && <p>Email: {email}</p>}
      {weekday && <p>{weekday}</p>}
      {weekend && <p>{weekend}</p>}
    </div>
  );
}
