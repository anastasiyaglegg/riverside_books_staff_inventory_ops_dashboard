// Populates Gift/Card catalog rows only -- unlike prisma/seed.ts's main(), this never
// touches books, customers, orders, staff, or policies. Safe to run against a database
// that already has real data in it (this repo's production DB has none in Gift/Card
// today, but does everywhere else -- prisma/seed.ts's full reset would wipe all of it).
//
//   npx dotenv -e .env.local -- npx tsx scripts/seed-gifts-and-cards.ts
//
// Idempotent by name/title -- safe to re-run; existing rows are left untouched, only
// missing ones are added. Mirrors the same GIFTS/CARDS catalog and random stock
// distribution as prisma/seed.ts's main() so this section looks consistent with how
// books are seeded (same 0-24/0-39 spread, so some titles land low/out of stock).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GIFTS: [name: string, category: string, priceCents: number][] = [
  ["Riverside Books Enamel Mug", "mug", 1495],
  ['"Just One More Chapter" Mug', "mug", 1595],
  ["Marble-Glaze Tea Mug", "mug", 1795],
  ["Classic Novels Tote Bag", "tote", 1895],
  ["Riverside Books Canvas Tote", "tote", 1695],
  ["Banned Books Tote Bag", "tote", 1995],
  ["Leather Bookmark Set", "stationery", 995],
  ["Literary Quotes Notebook", "stationery", 1295],
  ["Brass Corner Bookmark", "stationery", 795],
  ["Wax Seal Letter Kit", "stationery", 2295],
  ["Fountain Pen & Ink Set", "stationery", 2895],
  ["Book Nerd Sticker Pack", "stationery", 599],
  ["Reader's Notecard Set", "stationery", 1095],
  ["Book Lover's Enamel Pin", "pin", 795],
  ["Little Free Library Enamel Pin", "pin", 850],
  ["Cat & Book Enamel Pin", "pin", 795],
  ["Reading Socks (Pair)", "apparel", 1195],
  ['"I\'d Rather Be Reading" Tote', "tote", 1795],
  ["Bookish Beanie", "apparel", 2195],
  ["Library Scented Candle", "home", 2495],
  ["Old Book Smell Candle", "home", 2595],
  ["Cozy Reading Blanket", "home", 3995],
  ["Brass Bookend Pair", "home", 3495],
  ["Reading Nook LED Book Light", "home", 1895],
  ["1000-Piece Bookstore Puzzle", "puzzle", 1995],
  ["500-Piece Cozy Library Puzzle", "puzzle", 1695],
];

const CARDS: [title: string, occasion: string, priceCents: number][] = [
  ["Happy Birthday, Bookworm", "birthday", 550],
  ["Birthday Balloons", "birthday", 495],
  ["Another Chapter (Birthday)", "birthday", 550],
  ["Thank You (Floral)", "thank-you", 495],
  ["Thank You (Watercolor Leaves)", "thank-you", 525],
  ["Season's Readings", "holiday", 595],
  ["Cozy Winter Wishes", "holiday", 595],
  ["Happy Reading, Happy Holidays", "holiday", 550],
  ["With Sympathy", "sympathy", 550],
  ["Thinking of You", "sympathy", 525],
  ["Congratulations!", "congratulations", 550],
  ["You Did It! (Graduation)", "congratulations", 575],
  ["Blank Card (Botanical)", "blank", 450],
  ["Blank Card (Bookshelf Illustration)", "blank", 475],
  ["Happy Anniversary", "anniversary", 595],
  ["Still My Favorite Story (Anniversary)", "anniversary", 625],
  ["Get Well Soon", "get-well", 495],
  ["Feel Better Soon (Floral)", "get-well", 495],
  ["New Home, New Chapter", "congratulations", 550],
  ["Welcome, Little One (New Baby)", "congratulations", 575],
];

async function main() {
  let giftsAdded = 0;
  for (const [name, category, priceCents] of GIFTS) {
    const existing = await prisma.gift.findFirst({ where: { name } });
    if (existing) continue;
    await prisma.gift.create({
      data: { name, category, priceCents, quantityOnHand: Math.floor(Math.random() * 25) },
    });
    giftsAdded++;
  }

  let cardsAdded = 0;
  for (const [title, occasion, priceCents] of CARDS) {
    const existing = await prisma.card.findFirst({ where: { title } });
    if (existing) continue;
    await prisma.card.create({
      data: { title, occasion, priceCents, quantityOnHand: Math.floor(Math.random() * 40) },
    });
    cardsAdded++;
  }

  console.log(`Added ${giftsAdded} gift(s), ${cardsAdded} card(s). Existing rows left untouched.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
