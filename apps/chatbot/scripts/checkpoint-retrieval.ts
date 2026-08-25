// One-off checkpoint script per CLAUDE.md build order: print retrieval.ts
// output against the seeded data before wiring the LLM. Not part of the
// permanent npm scripts — safe to delete after review.
import "./env";
import {
  searchCatalog,
  lookupByIsbn,
  getStoreInfo,
  getUpcomingEvents,
  getSample,
  getItemsUnderPrice,
} from "../lib/retrieval";

async function main() {
  console.log("=== searchCatalog('Archer Pier') ===");
  console.log(JSON.stringify(await searchCatalog("Archer Pier"), null, 2));

  console.log("\n=== searchCatalog('Lanterns') ===");
  console.log(JSON.stringify(await searchCatalog("Lanterns"), null, 2));

  console.log("\n=== searchCatalog('Dune') (expect empty) ===");
  console.log(JSON.stringify(await searchCatalog("Dune"), null, 2));

  console.log("\n=== searchCatalog('birthday') (cards) ===");
  console.log(JSON.stringify(await searchCatalog("birthday"), null, 2));

  console.log("\n=== lookupByIsbn('9781630001002') ===");
  console.log(JSON.stringify(await lookupByIsbn("9781630001002"), null, 2));

  console.log("\n=== getStoreInfo(['hours']) ===");
  console.log(JSON.stringify(await getStoreInfo(["hours"]), null, 2));

  console.log("\n=== getStoreInfo(['policy']) ===");
  console.log(JSON.stringify(await getStoreInfo(["policy"]), null, 2));

  console.log("\n=== getUpcomingEvents(3) ===");
  console.log(JSON.stringify(await getUpcomingEvents(3), null, 2));

  console.log("\n=== getSample(1) (Lanterns, has staff_teaser) ===");
  console.log(JSON.stringify(await getSample(1), null, 2));

  console.log("\n=== getSample(999) (expect null) ===");
  console.log(JSON.stringify(await getSample(999), null, 2));

  console.log("\n=== getItemsUnderPrice(10, ['gift']) ===");
  console.log(JSON.stringify(await getItemsUnderPrice(10, ["gift"]), null, 2));
}

main().catch((err) => {
  console.error("Checkpoint failed:\n", err);
  process.exit(1);
});
