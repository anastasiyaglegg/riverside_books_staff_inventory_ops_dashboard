export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function deriveStockStatus(quantityOnHand: number, reorderThreshold: number): StockStatus {
  if (quantityOnHand <= 0) {
    return "out_of_stock";
  }
  if (quantityOnHand <= reorderThreshold) {
    return "low_stock";
  }
  return "in_stock";
}
