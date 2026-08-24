import "./env";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const ROOT = path.resolve(__dirname, "..");
const BASE_SCHEMA = path.join(ROOT, "reference", "riverside_books_schema_no_stripe.sql");
const MIGRATIONS_DIR = path.join(ROOT, "schema", "migrations");

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(MIGRATIONS_DIR, f));
}

async function main() {
  const files = [BASE_SCHEMA, ...migrationFiles()];
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log(
      "DATABASE_URL not set — can't apply migrations programmatically.\n" +
        "Apply these files by hand in the Supabase SQL Editor, IN ORDER:\n"
    );
    for (const f of files) console.log("  -", path.relative(ROOT, f));
    console.log(
      "\nSupabase dashboard -> SQL Editor -> New query -> paste each file's contents -> Run."
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(file, "utf8");
      console.log(`Applying ${path.relative(ROOT, file)}...`);
      await client.query(sql);
      console.log("  done.");
    }
    console.log("\nAll migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:\n", err);
  process.exit(1);
});
