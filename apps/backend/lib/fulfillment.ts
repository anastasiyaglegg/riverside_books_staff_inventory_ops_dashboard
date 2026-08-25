import type { Prisma } from "@prisma/client";
import { deriveStockStatus } from "@/lib/inventory";

// An order line for stock purposes: exactly one product ref plus a quantity. Matches both
// resolveCart's ResolvedOrderItem and a persisted OrderItem row (nullable ids).
export type StockLineItem = {
  bookId?: string | null;
  giftId?: string | null;
  cardId?: string | null;
  quantity: number;
};

// Applies a signed quantity change to each line's stock. sign = -1 sells (decrement),
// +1 restores (e.g. an order is cancelled). Runs inside the caller's transaction so the
// stock change commits atomically with the order write.
//
// Books track stock in a separate Inventory row (status recomputed via deriveStockStatus);
// gifts and cards track it inline. Changes are exact (not clamped) so a decrement and its
// later restore cancel out perfectly. A book with no Inventory row is skipped -- there's
// nothing to adjust. Sale-driven changes deliberately leave lastAdjustedById untouched;
// that attribution is only for manual staff PATCHes.
async function adjustStock(
  tx: Prisma.TransactionClient,
  items: StockLineItem[],
  sign: 1 | -1,
): Promise<void> {
  for (const item of items) {
    const delta = sign * item.quantity;
    if (item.bookId) {
      const inventory = await tx.inventory.findUnique({ where: { bookId: item.bookId } });
      if (!inventory) {
        continue;
      }
      const quantityOnHand = inventory.quantityOnHand + delta;
      await tx.inventory.update({
        where: { bookId: item.bookId },
        data: {
          quantityOnHand,
          status: deriveStockStatus(quantityOnHand, inventory.reorderThreshold),
        },
      });
    } else if (item.giftId) {
      const gift = await tx.gift.findUnique({ where: { id: item.giftId } });
      if (!gift) {
        continue;
      }
      await tx.gift.update({
        where: { id: item.giftId },
        data: { quantityOnHand: gift.quantityOnHand + delta },
      });
    } else if (item.cardId) {
      const card = await tx.card.findUnique({ where: { id: item.cardId } });
      if (!card) {
        continue;
      }
      await tx.card.update({
        where: { id: item.cardId },
        data: { quantityOnHand: card.quantityOnHand + delta },
      });
    }
  }
}

// Reduce stock for a newly placed/paid order.
export function decrementStockForOrderItems(
  tx: Prisma.TransactionClient,
  items: StockLineItem[],
): Promise<void> {
  return adjustStock(tx, items, -1);
}

// Give stock back when an order is cancelled.
export function restoreStockForOrderItems(
  tx: Prisma.TransactionClient,
  items: StockLineItem[],
): Promise<void> {
  return adjustStock(tx, items, 1);
}
