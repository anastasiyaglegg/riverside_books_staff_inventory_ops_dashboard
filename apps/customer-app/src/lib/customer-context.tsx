import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { Customer } from "@/types";

const STORAGE_KEY = "riverside_customer";

export type IdentifyInput = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

type CustomerContextValue = {
  customer: Customer | null;
  loading: boolean;
  // POST /customers is an explicit create (409s on an existing email/phone) --
  // used only by the standalone "set up my account" flow on the Account page.
  // Guest checkout (placing an order / reserving an event ticket) finds-or-creates
  // server-side and should call adopt() with the customer that comes back instead.
  identify: (input: IdentifyInput) => Promise<Customer>;
  adopt: (customer: Customer) => void;
  refresh: () => Promise<void>;
  // Fetches the signed-in customer via the Firebase-authed GET /customers/me, which
  // links/creates the record server-side by uid+email -- this is what restores loyalty
  // and order history on a fresh device after login. Returns null (and leaves customer
  // untouched) on a 403 EMAIL_NOT_VERIFIED so the caller can prompt to verify instead.
  loadMe: () => Promise<Customer | null>;
  signOut: () => void;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

function loadStoredCustomer(): Customer | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Customer;
  } catch {
    return null;
  }
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(() => loadStoredCustomer());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [customer]);

  async function identify(input: IdentifyInput): Promise<Customer> {
    setLoading(true);
    try {
      const created = await api.post<Customer>("/customers", input);
      setCustomer(created);
      return created;
    } finally {
      setLoading(false);
    }
  }

  function adopt(nextCustomer: Customer) {
    setCustomer(nextCustomer);
  }

  async function loadMe(): Promise<Customer | null> {
    setLoading(true);
    try {
      const me = await api.get<Customer>("/customers/me");
      setCustomer(me);
      return me;
    } catch (error) {
      // 403 = an account exists for this email but the Firebase email isn't verified yet;
      // the backend refuses to link it. Surface as null so the caller nudges verification
      // rather than treating it as a hard failure.
      if (error instanceof ApiError && error.status === 403) {
        return null;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function refresh(): Promise<void> {
    if (!customer) {
      return;
    }
    // GET /customers/:id is public (unguessable-UUID pattern, same as GET /orders/:id) --
    // this is how we pick up loyalty stamps staff added since the last visit.
    const refreshed = await api.get<Customer>(`/customers/${customer.id}`);
    setCustomer(refreshed);
  }

  function signOut() {
    setCustomer(null);
  }

  return (
    <CustomerContext.Provider
      value={{ customer, loading, identify, adopt, refresh, loadMe, signOut }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    throw new Error("useCustomer must be used within CustomerProvider");
  }
  return ctx;
}
