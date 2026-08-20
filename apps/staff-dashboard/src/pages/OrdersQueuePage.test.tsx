import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiGet = vi.fn();
const apiPatch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
  },
  ApiError: class ApiError extends Error {},
}));

import { OrdersQueuePage } from "@/pages/OrdersQueuePage";
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
      name: "Jane Doe",
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
      name: "Already Done",
      email: null,
      phone: null,
      loyaltyStampCount: 0,
      createdAt: "",
    },
    items: [],
  },
];

beforeEach(() => {
  apiGet.mockReset();
  apiPatch.mockReset();
});

describe("OrdersQueuePage", () => {
  it("shows only placed/ready_for_pickup orders in the queue", async () => {
    apiGet.mockResolvedValue(ORDERS);
    render(<OrdersQueuePage />);

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Already Done")).not.toBeInTheDocument();
  });

  it("transitions an order to ready_for_pickup", async () => {
    apiGet.mockResolvedValue(ORDERS);
    apiPatch.mockResolvedValue({ ...ORDERS[0], status: "ready_for_pickup" });
    const user = userEvent.setup();
    render(<OrdersQueuePage />);

    await screen.findByText("Jane Doe");
    await user.click(
      screen.getByRole("button", { name: "Mark Ready for Pickup" }),
    );

    expect(apiPatch).toHaveBeenCalledWith("/orders/order-1/status", {
      status: "ready_for_pickup",
    });
  });
});
