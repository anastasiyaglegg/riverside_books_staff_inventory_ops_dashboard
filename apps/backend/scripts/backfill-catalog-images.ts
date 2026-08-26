// Backfills imageUrl on every Gift/Card row that doesn't have one yet, using one
// representative photo per category/occasion (not a unique photo per item -- there's
// no per-product photography for this catalog, so items in the same category/occasion
// share an image, the same way a real gift shop might reuse a stock photo across
// variants of "mug" or "birthday card" in a catalog listing).
//
//   npx dotenv -e .env.local -- npx tsx scripts/backfill-catalog-images.ts
//
// Idempotent -- only fills rows where imageUrl is currently null, so re-running after
// a staff member sets a custom image via PATCH won't overwrite it. Sources: Wikimedia
// Commons (public domain / CC) for gift categories, Unsplash (Unsplash License, free
// to use) for card occasions -- both are stable CDNs safe to hotlink long-term.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Wikimedia's Special:FilePath redirect serves a resized JPEG (?width=600) instead of
// hotlinking the multi-megapixel original -- the raw commons uploads run 3-7K px wide,
// which is slow to decode/paint at a ~230px thumbnail and wastes real users' bandwidth.
const GIFT_CATEGORY_IMAGES: Record<string, string> = {
  mug: "https://commons.wikimedia.org/wiki/Special:FilePath/Black-and-white-coffee-cup-mug_%2823698833853%29.jpg?width=600",
  tote: "https://commons.wikimedia.org/wiki/Special:FilePath/Canvas%20tote%20bag%20from%20Books%20%26%20Books%2C%20Miami%2C%20Florida%2C%20USA%20-%2020130912.jpg?width=600",
  pin: "https://commons.wikimedia.org/wiki/Special:FilePath/Badge%20and%20pin%20%28AM%20626443-2%29%20%28cropped%29.jpg?width=600",
  puzzle:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Close%20up%20of%20Hand%20Cut%20Jigsaw%20Puzzle.JPG?width=600",
  stationery:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Desk%20with%20notebook%20pens%20and%20glasses.jpg?width=600",
  home: "https://commons.wikimedia.org/wiki/Special:FilePath/Candle%20burning.jpg?width=600",
  apparel:
    "https://commons.wikimedia.org/wiki/Special:FilePath/BLW%20Pair%20of%20socks.jpg?width=600",
};

// Unsplash's CDN resizes/re-encodes via query params -- same reasoning as above, a
// smaller request for a thumbnail-sized card.
const CARD_OCCASION_IMAGES: Record<string, string> = {
  birthday:
    "https://images.unsplash.com/photo-1542320189-e385758eaf08?w=600&q=80&fit=crop&auto=format",
  anniversary:
    "https://images.unsplash.com/photo-1758874090033-bc59ff94e502?w=600&q=80&fit=crop&auto=format",
  blank:
    "https://images.unsplash.com/photo-1748803798997-4e5efea2c9c5?w=600&q=80&fit=crop&auto=format",
  congratulations:
    "https://images.unsplash.com/photo-1709308702276-ace0fd6eff52?w=600&q=80&fit=crop&auto=format",
  "get-well":
    "https://images.unsplash.com/photo-1674089726237-ea12c4149261?w=600&q=80&fit=crop&auto=format",
  holiday:
    "https://images.unsplash.com/photo-1577201866982-97ac098537e5?w=600&q=80&fit=crop&auto=format",
  sympathy:
    "https://images.unsplash.com/photo-1604072762229-9075f8878d30?w=600&q=80&fit=crop&auto=format",
  "thank-you":
    "https://images.unsplash.com/photo-1487712010531-65e9aa8b4b1a?w=600&q=80&fit=crop&auto=format",
};

async function main() {
  const gifts = await prisma.gift.findMany({ where: { imageUrl: null } });
  let giftsUpdated = 0;
  for (const gift of gifts) {
    const imageUrl = gift.category ? GIFT_CATEGORY_IMAGES[gift.category] : undefined;
    if (!imageUrl) continue;
    await prisma.gift.update({ where: { id: gift.id }, data: { imageUrl } });
    giftsUpdated++;
  }

  const cards = await prisma.card.findMany({ where: { imageUrl: null } });
  let cardsUpdated = 0;
  for (const card of cards) {
    const imageUrl = card.occasion ? CARD_OCCASION_IMAGES[card.occasion] : undefined;
    if (!imageUrl) continue;
    await prisma.card.update({ where: { id: card.id }, data: { imageUrl } });
    cardsUpdated++;
  }

  console.log(`Backfilled imageUrl on ${giftsUpdated} gift(s), ${cardsUpdated} card(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
