import { Link } from "react-router-dom";
import { orderItemName, type Order } from "@/types";
import { formatCents } from "@/lib/money";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";

// A short human-friendly order reference from the uuid (last 6 chars).
function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

// "The Hobbit", or "The Hobbit + 2 more" when the order has multiple line items.
function itemsPreview(order: Order): string {
  const items = order.items ?? [];
  if (items.length === 0) {
    return "—";
  }
  const first = items[0] ? orderItemName(items[0]) : "1 item";
  const remaining = items.length - 1;
  return remaining > 0 ? `${first} + ${remaining} more` : first;
}

export function OrderRow({ order }: { order: Order }) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-stone-50"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-stone-900">
          <span className="text-stone-400">{shortId(order.id)}</span>
          <span className="truncate">{itemsPreview(order)}</span>
        </p>
        <p className="text-xs text-stone-500">
          {new Date(order.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <PaymentStatusBadge status={order.paymentStatus} />
        <OrderStatusBadge status={order.status} />
      </div>
      <span className="w-20 text-right text-sm font-semibold text-stone-900">
        {formatCents(order.totalCents)}
      </span>
    </Link>
  );
}
