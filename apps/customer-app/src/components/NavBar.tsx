import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCustomer } from "@/lib/customer-context";
import { useCart } from "@/lib/cart-context";

// The three catalogs, revealed by the "Products" menu. Books keep the original landing
// route (/catalog); the book detail route (/books/:id) also counts as "within Products"
// for active-highlighting the trigger.
const PRODUCT_LINKS = [
  { to: "/catalog", label: "Books" },
  { to: "/gifts", label: "Gifts" },
  { to: "/cards", label: "Cards" },
];
const PRODUCT_PATHS = ["/catalog", "/gifts", "/cards", "/books"];

const LINKS = [
  { to: "/events", label: "Events" },
  { to: "/favorites", label: "Favorites" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-brand-50 hover:text-brand-800"
  }`;

function ProductsMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const withinProducts = PRODUCT_PATHS.some((path) => location.pathname.startsWith(path));

  // Close on a route change (a link was picked) and on outside click / Escape.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          withinProducts || open
            ? "bg-brand-700 text-white"
            : "text-stone-600 hover:bg-brand-50 hover:text-brand-800"
        }`}
      >
        Products
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {PRODUCT_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              role="menuitem"
              className={({ isActive }) =>
                `block px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-50"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const { user, signOut: signOutAuth } = useAuth();
  const { signOut: signOutCustomer } = useCustomer();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  async function handleLogout() {
    // Auth first so onAuthStateChanged fires and guards are ready, then clear the local
    // loyalty record from this device.
    await signOutAuth();
    signOutCustomer();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-4">
        <NavLink to="/catalog" className="text-lg font-semibold tracking-tight text-brand-800">
          Riverside Books
        </NavLink>
        <nav className="flex flex-1 items-center gap-1">
          <ProductsMenu />
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/orders" className={navLinkClass}>
              Orders
            </NavLink>
          )}
          {user && (
            <NavLink to="/account" className={navLinkClass}>
              My Account
            </NavLink>
          )}
        </nav>
        <NavLink
          to="/cart"
          aria-label={`Cart${itemCount > 0 ? ` (${itemCount} item${itemCount === 1 ? "" : "s"})` : ""}`}
          className={({ isActive }) =>
            `relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              isActive ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-brand-50 hover:text-brand-800"
            }`
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="18" cy="20" r="1.4" />
            <path d="M2.5 3.5h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
          </svg>
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
              {itemCount}
            </span>
          )}
        </NavLink>
        {user ? (
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Log out
          </button>
        ) : (
          <NavLink
            to="/login"
            className="rounded-lg bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Log in
          </NavLink>
        )}
      </div>
    </header>
  );
}
