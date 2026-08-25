import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { generateMarketingContentSchema } from "@/lib/validation/marketing";
import { mapBooksToMarketingCatalog } from "@/lib/marketing/catalog-mapper";
import { generateMarketingContent, ContentGeneratorError } from "@/lib/marketing/client";

// Staff-only mediation layer between our catalog and the vendored Product D
// service (apps/content-generator): pulls the requested books, aliases them
// into Product D's own JSON Schema contract, and forwards them to its
// /generate endpoint untouched. See lib/marketing/catalog-mapper.ts for why
// field translation -- not validity judgment -- is all this layer does.
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

  const books = await prisma.book.findMany({
    where: { id: { in: parsed.data.bookIds } },
    include: { inventory: true },
  });

  const catalog = mapBooksToMarketingCatalog(books);

  try {
    const result = await generateMarketingContent(catalog);
    return ok(result);
  } catch (err) {
    if (err instanceof ContentGeneratorError) {
      return fail(err.message, err.status, "CONTENT_GENERATOR_ERROR");
    }
    throw err;
  }
}
