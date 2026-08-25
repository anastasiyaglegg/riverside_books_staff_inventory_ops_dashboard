import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/money";
import { orderItemName, type Order, type OrderStatus } from "@/types";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

const STATUS_SEQUENCE: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Placed" },
  { status: "ready_for_pickup", label: "Ready for Pickup" },
  { status: "completed", label: "Completed" },
];

function StatusSteps({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-medium text-white">
          Cancelled
        </span>
      </div>
    );
  }

  const currentIndex = STATUS_SEQUENCE.findIndex((step) => step.status === status);
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {STATUS_SEQUENCE.map((step, index) => (
        <span
          key={step.status}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            index <= currentIndex
              ? "bg-brand-700 text-white"
              : "border border-stone-200 bg-stone-50 text-stone-400"
          }`}
        >
          {step.label}
        </span>
      ))}
    </div>
  );
}

export function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const justPlaced = Boolean((location.state as { justPlaced?: boolean } | null)?.justPlaced);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    api
      .get<Order>(`/orders/${id}`)
      .then((result) => {
        if (!cancelled) {
          setOrder(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Couldn't load this order.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p className="py-12 text-center text-stone-500">Loading order…</p>;
  }
  if (errorMessage || !order) {
    return <p className="py-12 text-center text-rose-600">{errorMessage ?? "Order not found."}</p>;
  }

  return (
    <div>
      {justPlaced && (
        <p className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your pre-order is in! We'll reach out when it's ready for pickup — pay in store at
          pickup.
        </p>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Order Status</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <StatusSteps status={order.status} />

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {order.items?.map((item) => (
          <div
            key={item.id}
            className="flex justify-between border-b border-stone-100 py-2 text-sm last:border-b-0"
          >
            <span className="text-stone-700">
              {item.quantity} × {orderItemName(item)}
            </span>
            <span className="text-stone-700">{formatCents(item.unitPriceCents * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-stone-200 pt-3 font-semibold text-stone-900">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
