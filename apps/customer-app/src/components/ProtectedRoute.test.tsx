import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { User } from "firebase/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Control what useAuth returns per-test.
const useAuthMock = vi.fn();
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

function renderAt(initialPath = "/account") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <p>Account secret</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<p>Login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading placeholder while auth is resolving", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    renderAt();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Account secret")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no user", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    renderAt();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
    expect(screen.queryByText("Account secret")).not.toBeInTheDocument();
  });

  it("renders children when a user is present", () => {
    useAuthMock.mockReturnValue({ user: { uid: "abc" } as User, loading: false });
    renderAt();
    expect(screen.getByText("Account secret")).toBeInTheDocument();
  });
});
