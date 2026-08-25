import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CustomerProvider } from "@/lib/customer-context";
import { OrdersPage } from "@/pages/OrdersPage";
import type { Customer, Order } from "@/types";

const CUSTOMER: Customer = {
  id: "cust-1",
  firstName: "Ada",
  lastName: "Reader",
  email: "ada@example.com",
  phone: null,
  loyaltyStampCount: 0,
  createdAt: "",
};

function makeOrder(id: string, status: Order["status"], title: string): Order {
  return {
    id,
    customerId: "cust-1",
    status,
    paymentStatus: "paid_online",
    totalCents: 1500,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    items: [{ id: `it-${id}`, orderId: id, bookId: `b-${id}`, giftId: null, cardId: null, quantity: 1, unitPriceCents: 1500, book: { id: `b-${id}`, title, author: "A", isbn: null, priceCents: 1500, category: null, description: null, imageUrl: null, rating: null, createdAt: "", updatedAt: "" } }],
  };
}

const ORDERS = [
  makeOrder("aaa111", "placed", "Placed Book"),
  makeOrder("bbb222", "completed", "Completed Book"),
  makeOrder("ccc333", "cancelled", "Cancelled Book"),
];

function renderOrders() {
  return render(
    <MemoryRouter>
      <CustomerProvider>
        <OrdersPage />
      </CustomerProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  // Seed the customer so OrdersPage fetches directly (no loadMe needed).
  localStorage.setItem("riverside_customer", JSON.stringify(CUSTOMER));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: ORDERS, error: null }),
    }),
  );
});

describe("OrdersPage", () => {
  it("lists all the customer's orders by default", async () => {
    renderOrders();
    expect(await screen.findByText("Placed Book")).toBeInTheDocument();
    expect(screen.getByText("Completed Book")).toBeInTheDocument();
    expect(screen.getByText("Cancelled Book")).toBeInTheDocument();
  });

  it("filters to a single status when its tab is selected", async () => {
    const user = userEvent.setup();
    renderOrders();
    await screen.findByText("Placed Book");

    await user.click(screen.getByRole("button", { name: /Completed/ }));

    expect(screen.getByText("Completed Book")).toBeInTheDocument();
    expect(screen.queryByText("Placed Book")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelled Book")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no orders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], error: null }),
      }),
    );
    renderOrders();
    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();
  });
});
