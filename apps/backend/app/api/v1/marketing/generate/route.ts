import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { generateMarketingContentSchema } from "@/lib/validation/marketing";
import {
  mapBooksToMarketingCatalog,
  mapEventsToMarketingCatalog,
} from "@/lib/marketing/catalog-mapper";
import { generateMarketingContent, ContentGeneratorError } from "@/lib/marketing/client";
import { persistGeneratedDrafts } from "@/lib/marketing/persist";

// Staff-only mediation layer between our catalog and the vendored Product D
// service (apps/content-generator): pulls the requested books, aliases them
// into Product D's own JSON Schema contract, and forwards them to its
// /generate endpoint untouched. See lib/marketing/catalog-mapper.ts for why
// field translation -- not validity judgment -- is all this layer does.
// Successful drafts are persisted (lib/marketing/persist.ts) so GET
// /books/:id can surface them to the public storefront.
export async function POST(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const body = await request.json();
  const parsed = generateMarketingContentSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const { bookIds = [], eventIds = [] } = parsed.data;

  const books = bookIds.length
    ? await prisma.book.findMany({
        where: { id: { in: bookIds } },
        include: { inventory: true },
      })
    : [];
  const events = eventIds.length
    ? await prisma.event.findMany({ where: { id: { in: eventIds } } })
    : [];

  const catalog = [...mapBooksToMarketingCatalog(books), ...mapEventsToMarketingCatalog(events)];

  try {
    const result = await generateMarketingContent(catalog);
    // Only book drafts have a persistence home (BookMarketingContent, keyed by
    // a real Book id). Event drafts are returned to the caller but not stored
    // until an event-content model exists -- persisting them here would violate
    // the bookId foreign key.
    const bookIdSet = new Set(books.map((b) => b.id));
    await persistGeneratedDrafts(result.generated_drafts.filter((d) => bookIdSet.has(d.book_id)));
    return ok(result);
  } catch (err) {
    if (err instanceof ContentGeneratorError) {
      return fail(err.message, err.status, "CONTENT_GENERATOR_ERROR");
    }
    throw err;
  }
}
