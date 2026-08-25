import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NavBar } from "@/components/NavBar";
import { LoginPage } from "@/pages/LoginPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { MerchandisePage } from "@/pages/MerchandisePage";
import { BookFormPage } from "@/pages/BookFormPage";
import { OrdersQueuePage } from "@/pages/OrdersQueuePage";
import { LoyaltyPage } from "@/pages/LoyaltyPage";
import { EventsPage } from "@/pages/EventsPage";
import { PoliciesPage } from "@/pages/PoliciesPage";
import { WeeklySnapshotPage } from "@/pages/WeeklySnapshotPage";

function AuthedLayout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  return (
    <ProtectedRoute>
      {session && <NavBar />}
      <main className="app-main">{children}</main>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/inventory" replace />} />
      <Route
        path="/inventory"
        element={
          <AuthedLayout>
            <InventoryPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/books/new"
        element={
          <AuthedLayout>
            <BookFormPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/books/:id/edit"
        element={
          <AuthedLayout>
            <BookFormPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/orders"
        element={
          <AuthedLayout>
            <OrdersQueuePage />
          </AuthedLayout>
        }
      />
      <Route
        path="/merchandise"
        element={
          <AuthedLayout>
            <MerchandisePage />
          </AuthedLayout>
        }
      />
      <Route
        path="/loyalty"
        element={
          <AuthedLayout>
            <LoyaltyPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/events"
        element={
          <AuthedLayout>
            <EventsPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/policies"
        element={
          <AuthedLayout>
            <PoliciesPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/snapshot"
        element={
          <AuthedLayout>
            <WeeklySnapshotPage />
          </AuthedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/inventory" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
