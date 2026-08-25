import { prisma } from "@/lib/prisma";
import type { MarketingDraft } from "@/lib/marketing/client";

// Saves each generated draft as the book's current marketing content -- one
// row per book, regenerating overwrites it (staff generate once, the
// customer app always shows whatever was last generated). Every book_id here
// traces back to a book the route just looked up and sent, so a missing book
// isn't a real possibility to guard against.
export async function persistGeneratedDrafts(drafts: MarketingDraft[]): Promise<void> {
  await Promise.all(
    drafts.map((draft) =>
      prisma.bookMarketingContent.upsert({
        where: { bookId: draft.book_id },
        create: {
          bookId: draft.book_id,
          contentType: draft.content_type,
          headline: draft.headline,
          bodyCopy: draft.body_copy,
          reason: draft.reason,
          sourceFields: draft.source_fields,
        },
        update: {
          contentType: draft.content_type,
          headline: draft.headline,
          bodyCopy: draft.body_copy,
          reason: draft.reason,
          sourceFields: draft.source_fields,
        },
      }),
    ),
  );
}
