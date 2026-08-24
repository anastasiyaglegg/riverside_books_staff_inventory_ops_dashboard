-- Split customers.name into first_name / last_name, preserving existing data.

-- 1. Add new columns (nullable during backfill).
ALTER TABLE "customers" ADD COLUMN "first_name" TEXT;
ALTER TABLE "customers" ADD COLUMN "last_name" TEXT;

-- 2. Backfill: first token -> first_name; everything after the first space -> last_name
--    (NULL when the name is a single token).
UPDATE "customers"
SET "first_name" = split_part("name", ' ', 1),
    "last_name"  = CASE
      WHEN position(' ' in "name") > 0
      THEN NULLIF(btrim(substring("name" from position(' ' in "name") + 1)), '')
      ELSE NULL
    END;

-- 3. Any row with an empty/blank name gets a safe placeholder so first_name can be NOT NULL.
UPDATE "customers" SET "first_name" = 'Customer' WHERE "first_name" IS NULL OR "first_name" = '';

-- 4. Enforce NOT NULL on first_name and drop the old column.
ALTER TABLE "customers" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "customers" DROP COLUMN "name";
