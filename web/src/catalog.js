export const SAMPLE_CATALOG = [
  {
    book_id: "RB-001",
    title: "The Cartographer's Lantern",
    author: "Mara Ellison",
    genre: "Historical Fiction",
    price: 18.99,
    stock_status: "in_stock",
    description:
      "A richly imagined story about maps, memory, and the people who redraw the boundaries of home.",
    rating: 4.7,
    promotional_tag: "Staff Pick",
  },
  {
    book_id: "RB-002",
    title: "Small Hours in Orbit",
    author: "Jon Bell",
    genre: "Science Fiction",
    price: 16.5,
    stock_status: "low_stock",
    description:
      "A character-driven space adventure about friendship, difficult choices, and finding a way back.",
    rating: 4.4,
    promotional_tag: "New Release",
  },
];

export function formatCatalog(records) {
  return JSON.stringify(records, null, 2);
}

export function parseCatalogText(text) {
  if (!text.trim()) {
    throw new Error("Paste a catalog JSON array or load the sample catalog.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The catalog is not valid JSON. Check commas and brackets.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Catalog JSON must be a top-level array of book records.");
  }

  return parsed;
}
