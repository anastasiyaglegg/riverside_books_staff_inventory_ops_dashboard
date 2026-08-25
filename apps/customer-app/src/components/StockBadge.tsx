import type { StockStatus } from "@/types";
import { stockStatusLabel } from "@/lib/stock";

const STOCK_STATUS_STYLES: Record<StockStatus, string> = {
  in_stock: "bg-emerald-100 text-emerald-800",
  low_stock: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-rose-100 text-rose-800",
};

export function StockBadge({ status }: { status: StockStatus | undefined }) {
  const styles = status ? STOCK_STATUS_STYLES[status] : "bg-stone-100 text-stone-600";
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${styles}`}>
      {stockStatusLabel(status)}
    </span>
  );
}
