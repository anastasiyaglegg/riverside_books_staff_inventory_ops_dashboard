import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";

describe("PaymentStatusBadge", () => {
  it("labels paid_online as Paid", () => {
    render(<PaymentStatusBadge status="paid_online" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("labels pay_in_store as Pay in store", () => {
    render(<PaymentStatusBadge status="pay_in_store" />);
    expect(screen.getByText("Pay in store")).toBeInTheDocument();
  });

  it("labels unpaid as Unpaid", () => {
    render(<PaymentStatusBadge status="unpaid" />);
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
  });
});
