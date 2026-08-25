import type { PaymentStatus } from "@/types";

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid_online: "Paid",
  pay_in_store: "Pay in store",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-stone-200 text-stone-600",
  paid_online: "bg-emerald-100 text-emerald-800",
  pay_in_store: "bg-sky-100 text-sky-800",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLES[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
