import "./env";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { getSupabaseAdmin } from "../lib/supabase";

const ROOT = path.resolve(__dirname, "..");
const DATASET_PATH = path.join(
  ROOT,
  "reference",
  "riverside_books_synthetic_dataset__1_.json"
);

// Order matters for FK constraints (events.featured_book_id -> books,
// orders.customer_id -> customers). The reference dataset already lists
// tables in an FK-safe order; we insert it as-is rather than reordering.
const KNOWN_TABLES = new Set([
  "customers",
  "books",
  "cards",
  "gifts",
  "events",
  "orders",
  "store_info",
  "chat_logs",
  "marketing_content",
  "inventory_history",
]);

interface DatasetEntry {
  table: string;
  rows: Record<string, unknown>[];
}

async function main() {
  const dataset: DatasetEntry[] = JSON.parse(readFileSync(DATASET_PATH, "utf8"));
  const supabase = getSupabaseAdmin();

  for (const entry of dataset) {
    if (!KNOWN_TABLES.has(entry.table)) {
      console.error(`Unknown table "${entry.table}" in dataset — refusing to insert.`);
      process.exit(1);
    }
    if (entry.rows.length === 0) continue;
    console.log(`Seeding ${entry.table} (${entry.rows.length} rows)...`);
    const { error } = await supabase.from(entry.table).insert(entry.rows);
    if (error) {
      console.error(`Failed to seed ${entry.table}:\n`, error);
      process.exit(1);
    }
  }
  console.log("All tables seeded.");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn(
      "\nWARNING: DATABASE_URL not set — id sequences were NOT reset.\n" +
        "Seeded rows used explicit ids; the next row the app inserts without an\n" +
        "explicit id (e.g. a new chat_logs row) may collide with a seeded id.\n" +
        "Set DATABASE_URL and re-run `npm run seed`, or reset sequences by hand in\n" +
        "the Supabase SQL Editor:\n" +
        "  SELECT setval(pg_get_serial_sequence('<table>', 'id'), (SELECT MAX(id) FROM <table>));"
    );
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const entry of dataset) {
      if (entry.rows.length === 0) continue;
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${entry.table}))`,
        [entry.table]
      );
    }
    console.log("Sequences reset for all seeded tables.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:\n", err);
  process.exit(1);
});
