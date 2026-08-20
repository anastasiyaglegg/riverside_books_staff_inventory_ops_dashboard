import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { to: "/inventory", label: "Inventory" },
  { to: "/orders", label: "Pre-Order Queue" },
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
