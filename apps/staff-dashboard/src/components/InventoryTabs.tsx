import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/inventory", label: "Books", end: true },
  { to: "/inventory/cards", label: "Cards" },
  { to: "/inventory/gifts", label: "Gifts" },
];

// Books, cards, and gifts are all inventory -- one section, three tabs, rather
// than a separate top-level "Gifts & Cards" nav item split off on its own.
export function InventoryTabs() {
  return (
    <div className="tab-bar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            isActive ? "tab-link active" : "tab-link"
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
