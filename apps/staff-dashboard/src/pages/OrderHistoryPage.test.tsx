import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
  },
  ApiError: class ApiError extends Error {},
}));

import { OrderHistoryPage } from "@/pages/OrderHistoryPage";
import type { Order } from "@/types";

const ORDERS: Order[] = [
  {
    id: "order-1",
    customerId: "cust-1",
    status: "placed",
    paymentStatus: "unpaid",
    totalCents: 1500,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    customer: {
      id: "cust-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: null,
      loyaltyStampCount: 0,
      createdAt: "",
    },
    items: [],
  },
  {
    id: "order-2",
    customerId: "cust-2",
    status: "completed",
    paymentStatus: "paid_online",
    totalCents: 2000,
    createdAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    customer: {
      id: "cust-2",
      firstName: "Already",
      lastName: "Done",
      email: null,
      phone: null,
      loyaltyStampCount: 0,
      createdAt: "",
    },
    items: [],
  },
  {
    id: "order-3",
    customerId: "cust-3",
    status: "cancelled",
    paymentStatus: "pay_in_store",
    totalCents: 900,
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    customer: {
      id: "cust-3",
      firstName: "Never",
      lastName: "Showed",
      email: null,
      phone: "555-1234",
      loyaltyStampCount: 0,
      createdAt: "",
    },
    items: [],
  },
];

beforeEach(() => {
  apiGet.mockReset();
});

describe("OrderHistoryPage", () => {
  it("shows orders of every status, unlike the pre-order queue", async () => {
    apiGet.mockResolvedValue(ORDERS);
    render(<OrderHistoryPage />);

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Already Done")).toBeInTheDocument();
    expect(screen.getByText("Never Showed")).toBeInTheDocument();
  });

  it("sorts newest first", async () => {
    apiGet.mockResolvedValue(ORDERS);
    render(<OrderHistoryPage />);

    await screen.findByText("Jane Doe");
    const rows = screen.getAllByRole("row").slice(1); // drop header row
    const names = rows.map((row) => row.textContent);
    expect(names[0]).toContain("Never Showed");
    expect(names[1]).toContain("Already Done");
    expect(names[2]).toContain("Jane Doe");
  });

  it("filters by status", async () => {
    apiGet.mockResolvedValue(ORDERS);
    const user = userEvent.setup();
    render(<OrderHistoryPage />);

    await screen.findByText("Jane Doe");
    await user.selectOptions(screen.getByLabelText("Status"), "cancelled");

    expect(screen.getByText("Never Showed")).toBeInTheDocument();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("Already Done")).not.toBeInTheDocument();
  });

  it("has no status-change actions -- history is read-only", async () => {
    apiGet.mockResolvedValue(ORDERS);
    render(<OrderHistoryPage />);

    await screen.findByText("Jane Doe");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
