import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NavBar } from "@/components/NavBar";
import { LoginPage } from "@/pages/LoginPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { CardsInventoryPage } from "@/pages/CardsInventoryPage";
import { GiftsInventoryPage } from "@/pages/GiftsInventoryPage";
import { CardFormPage } from "@/pages/CardFormPage";
import { GiftFormPage } from "@/pages/GiftFormPage";
import { MarketingEmbedPage } from "@/pages/MarketingEmbedPage";
import { MarketingContentPage } from "@/pages/MarketingContentPage";
import { BookFormPage } from "@/pages/BookFormPage";
import { OrdersQueuePage } from "@/pages/OrdersQueuePage";
import { OrderHistoryPage } from "@/pages/OrderHistoryPage";
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
        path="/orders/history"
        element={
          <AuthedLayout>
            <OrderHistoryPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/inventory/cards"
        element={
          <AuthedLayout>
            <CardsInventoryPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/inventory/gifts"
        element={
          <AuthedLayout>
            <GiftsInventoryPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/cards/new"
        element={
          <AuthedLayout>
            <CardFormPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/gifts/new"
        element={
          <AuthedLayout>
            <GiftFormPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/marketing"
        element={
          <AuthedLayout>
            <MarketingEmbedPage />
          </AuthedLayout>
        }
      />
      <Route
        path="/marketing/storefront"
        element={
          <AuthedLayout>
            <MarketingContentPage />
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
