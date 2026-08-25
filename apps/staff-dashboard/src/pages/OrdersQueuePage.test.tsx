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

  it("shows gift and card line items by their own name, not the book field", async () => {
    apiGet.mockResolvedValue([
      {
        ...ORDERS[0],
        items: [
          {
            id: "item-1",
            orderId: "order-1",
            bookId: null,
            giftId: "gift-1",
            gift: { id: "gift-1", name: "Enamel Mug", priceCents: 1200 },
            cardId: null,
            quantity: 2,
            unitPriceCents: 1200,
          },
          {
            id: "item-2",
            orderId: "order-1",
            bookId: null,
            giftId: null,
            cardId: "card-1",
            card: { id: "card-1", title: "Birthday Card", priceCents: 500 },
            quantity: 1,
            unitPriceCents: 500,
          },
        ],
      },
    ]);
    render(<OrdersQueuePage />);

    expect(
      await screen.findByText("2× Enamel Mug, 1× Birthday Card"),
    ).toBeInTheDocument();
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
