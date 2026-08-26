// One-off add of the "Go With The Flow" T-Shirt gift -- a custom design (not a stock
// photo like the other apparel rows), so it gets its own image instead of the shared
// GIFT_CATEGORY_IMAGES["apparel"] fallback from backfill-catalog-images.ts. Image lives
// in apps/customer-app/public/images (served at the storefront's own origin), so it's a
// relative path rather than the absolute-URL convention used for the Wikimedia/Unsplash
// category images -- fine for the storefront <img> tag, but note a future PATCH through
// the staff API would need a real URL since createGiftSchema/updateGiftSchema require
// z.string().url().
//
//   npx dotenv -e .env.local -- npx tsx scripts/add-go-with-the-flow-shirt.ts
//
// Idempotent by name -- safe to re-run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const name = '"Go With The Flow" T-Shirt';
  const existing = await prisma.gift.findFirst({ where: { name } });
  if (existing) {
    console.log(`"${name}" already exists (id ${existing.id}), skipping.`);
    return;
  }

  const gift = await prisma.gift.create({
    data: {
      name,
      category: "apparel",
      priceCents: 2495,
      imageUrl: "/images/go-with-the-flow-tshirt.jpg",
      quantityOnHand: 15,
    },
  });
  console.log(`Created gift "${gift.name}" (id ${gift.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
