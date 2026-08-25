import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { to: "/inventory", label: "Inventory" },
  { to: "/merchandise", label: "Gifts & Cards" },
  { to: "/marketing", label: "Marketing Content", end: true },
  { to: "/marketing/storefront", label: "Generate for Storefront" },
  { to: "/orders", label: "Pre-Order Queue", end: true },
  { to: "/orders/history", label: "Order History" },
  { to: "/loyalty", label: "Loyalty" },
  { to: "/events", label: "Events" },
  { to: "/policies", label: "Store Policies" },
  { to: "/snapshot", label: "Weekly Snapshot" },
];

export function NavBar() {
  const { signOut } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-title">Riverside Books — Staff</div>
      <div className="navbar-links">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive ? "navbar-link active" : "navbar-link"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={() => void signOut()}>
        Sign out
      </button>
    </nav>
  );
}
