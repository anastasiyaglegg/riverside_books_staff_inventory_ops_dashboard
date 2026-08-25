import type { OrderStatus } from "@/types";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  placed: "bg-sky-100 text-sky-800",
  ready_for_pickup: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
