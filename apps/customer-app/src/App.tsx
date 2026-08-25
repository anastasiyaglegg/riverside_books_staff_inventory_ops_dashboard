import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { CustomerProvider } from "@/lib/customer-context";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import { NavBar } from "@/components/NavBar";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CatalogPage } from "@/pages/CatalogPage";
import { GiftsPage } from "@/pages/GiftsPage";
import { CardsPage } from "@/pages/CardsPage";
import { BookDetailPage } from "@/pages/BookDetailPage";
import { AccountPage } from "@/pages/AccountPage";
import { AuthPage } from "@/pages/AuthPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderStatusPage } from "@/pages/OrderStatusPage";
import { EventsPage } from "@/pages/EventsPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CheckoutReturnPage } from "@/pages/CheckoutReturnPage";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <EmailVerificationBanner />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/catalog" replace />} />
      <Route
        path="/catalog"
        element={
          <AppLayout>
            <CatalogPage />
          </AppLayout>
        }
      />
      <Route
        path="/gifts"
        element={
          <AppLayout>
            <GiftsPage />
          </AppLayout>
        }
      />
      <Route
        path="/cards"
        element={
          <AppLayout>
            <CardsPage />
          </AppLayout>
        }
      />
      <Route
        path="/books/:id"
        element={
          <AppLayout>
            <BookDetailPage />
          </AppLayout>
        }
      />
      <Route
        path="/events"
        element={
          <AppLayout>
            <EventsPage />
          </AppLayout>
        }
      />
      <Route
        path="/login"
        element={
          <AppLayout>
            <AuthPage />
          </AppLayout>
        }
      />
      <Route
        path="/account"
        element={
          <AppLayout>
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/orders"
        element={
          <AppLayout>
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <AppLayout>
            <OrderStatusPage />
          </AppLayout>
        }
      />
      <Route
        path="/favorites"
        element={
          <AppLayout>
            <FavoritesPage />
          </AppLayout>
        }
      />
      <Route
        path="/cart"
        element={
          <AppLayout>
            <CartPage />
          </AppLayout>
        }
      />
      <Route
        path="/checkout"
        element={
          <AppLayout>
            <CheckoutPage />
          </AppLayout>
        }
      />
      <Route
        path="/checkout/return"
        element={
          <AppLayout>
            <CheckoutReturnPage />
          </AppLayout>
        }
      />
      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <FavoritesProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </FavoritesProvider>
      </CustomerProvider>
    </AuthProvider>
  );
}
