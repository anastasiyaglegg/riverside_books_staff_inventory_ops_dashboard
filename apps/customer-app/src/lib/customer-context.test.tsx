import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerProvider, useCustomer } from "@/lib/customer-context";
import { customerFullName, type Customer } from "@/types";

const MOCK_CUSTOMER: Customer = {
  id: "customer-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: null,
  loyaltyStampCount: 3,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function TestHarness() {
  const { customer, identify, refresh, loadMe, signOut } = useCustomer();
  return (
    <div>
      <p data-testid="customer-name">{customer ? customerFullName(customer) : "none"}</p>
      <p data-testid="stamp-count">{customer?.loyaltyStampCount ?? "none"}</p>
      <button
        onClick={() =>
          identify({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
        }
      >
        Identify
      </button>
      <button onClick={() => refresh()}>Refresh</button>
      <button onClick={() => loadMe()}>Load me</button>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("CustomerProvider", () => {
  it("starts with no customer when localStorage is empty", () => {
    render(
      <CustomerProvider>
        <TestHarness />
      </CustomerProvider>,
    );
    expect(screen.getByTestId("customer-name")).toHaveTextContent("none");
  });

  it("identify() stores the matched customer and persists it to localStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: MOCK_CUSTOMER, error: null }),
      }),
    );
    const user = userEvent.setup();

    render(
      <CustomerProvider>
        <TestHarness />
      </CustomerProvider>,
    );
    await user.click(screen.getByText("Identify"));

    await waitFor(() =>
      expect(screen.getByTestId("customer-name")).toHaveTextContent("Ada Lovelace"),
    );
    expect(JSON.parse(localStorage.getItem("riverside_customer") ?? "{}")).toMatchObject({
      id: "customer-1",
    });
  });

  it("refresh() re-fetches the customer by id via GET, not POST", async () => {
    localStorage.setItem("riverside_customer", JSON.stringify(MOCK_CUSTOMER));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ data: { ...MOCK_CUSTOMER, loyaltyStampCount: 7 }, error: null }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <CustomerProvider>
        <TestHarness />
      </CustomerProvider>,
    );
    await user.click(screen.getByText("Refresh"));

    await waitFor(() => expect(screen.getByTestId("stamp-count")).toHaveTextContent("7"));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toContain("/customers/customer-1");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("loadMe() fetches GET /customers/me and stores the customer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: MOCK_CUSTOMER, error: null }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <CustomerProvider>
        <TestHarness />
      </CustomerProvider>,
    );
    await user.click(screen.getByText("Load me"));

    await waitFor(() =>
      expect(screen.getByTestId("customer-name")).toHaveTextContent("Ada Lovelace"),
    );
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toContain("/customers/me");
  });

  it("loadMe() leaves the customer unset on a 403 EMAIL_NOT_VERIFIED", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({ data: null, error: { message: "verify", code: "EMAIL_NOT_VERIFIED" } }),
      }),
    );
    const user = userEvent.setup();

    render(
      <CustomerProvider>
        <TestHarness />
      </CustomerProvider>,
    );
    await user.click(screen.getByText("Load me"));

    // No throw, and the customer stays unset so the caller can nudge verification.
    await waitFor(() =>
      expect(screen.getByTestId("customer-name")).toHaveTextContent("none"),
    );
  });

  it("signOut() clears the customer and localStorage", async () => {
    localStorage.setItem("riverside_customer", JSON.stringify(MOCK_CUSTOMER));
    const user = userEvent.setup();

    render(
      <CustomerProvider>
        <TestHarness />
      </CustomerProvider>,
    );
    expect(screen.getByTestId("customer-name")).toHaveTextContent("Ada Lovelace");

    await user.click(screen.getByText("Sign out"));

    expect(screen.getByTestId("customer-name")).toHaveTextContent("none");
    expect(localStorage.getItem("riverside_customer")).toBeNull();
  });
});
