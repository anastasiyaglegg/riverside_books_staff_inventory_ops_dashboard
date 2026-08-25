import type { StockStatus } from "@/types";

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

export function stockStatusLabel(status: StockStatus | undefined): string {
  if (!status) {
    return "Availability Unknown";
  }
  return STOCK_STATUS_LABELS[status];
}
