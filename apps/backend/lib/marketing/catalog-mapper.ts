// The exact wire contract Product D's own JSON Schema (book.schema.json in
// apps/content-generator/data) requires per record. Field names are aliased
// from our Book model (book_id <- id, genre <- category, price <- priceCents
// / 100, stock_status <- inventory.status) since the two products were built
// independently against the same PRD but chose different names/units.
// stock_status is typed as string, not lib/inventory's StockStatus union --
// Prisma's `status` column is an unconstrained string column (see schema
// comment), and validating it's one of the three real values is Product D's
// own validator's job, not this mapper's (see the note below).
// author/price are optional on the wire: books always carry them, but events
// (mapped below) have no source for them, so per the same no-fabrication rule
// they're omitted. Product D's validator is the single source of truth for
// whether a record missing them is usable.
export type MarketingCatalogRecord = {
  book_id: string;
  title: string;
  author?: string;
  genre?: string;
  price?: number;
  stock_status?: string;
  description?: string;
  rating?: number;
  promotional_tag: string | null;
};

export type BookForMarketing = {
  id: string;
  title: string;
  author: string;
  category: string | null;
  priceCents: number;
  description: string | null;
  rating: number | null;
  inventory?: { status: string } | null;
};

// Pure field aliasing -- no judgment calls about what's "good enough" to send.
// A field we have no source for (category/description/rating/inventory all
// null) is simply omitted rather than defaulted or fabricated; Product D's own
// validator (already built and tested against this exact schema) is the
// single source of truth for whether an incomplete record is usable, and its
// response reports exactly which records it rejected and why. Duplicating
// that judgment here would just risk the two sides drifting out of sync.
export function mapBookToMarketingRecord(book: BookForMarketing): MarketingCatalogRecord {
  return {
    book_id: book.id,
    title: book.title,
    author: book.author,
    ...(book.category && { genre: book.category }),
    // priceCents is always a whole number of cents, so /100 is exact to two
    // decimal places -- matches the schema's multipleOf: 0.01 requirement.
    price: book.priceCents / 100,
    ...(book.inventory && { stock_status: book.inventory.status }),
    ...(book.description && { description: book.description }),
    ...(book.rating !== null && book.rating !== undefined && { rating: book.rating }),
    // We have no equivalent field; null is a valid, explicit "no tag" per the
    // schema (unlike the fields above, it's typed to allow null).
    promotional_tag: null,
  };
}

export function mapBooksToMarketingCatalog(books: BookForMarketing[]): MarketingCatalogRecord[] {
  return books.map(mapBookToMarketingRecord);
}

export type EventForMarketing = {
  id: string;
  title: string;
  description: string | null;
};

// Events flow through the same Product D contract as books. We have no source
// for author/genre/price/stock/rating on an event, so -- same no-fabrication
// rule as books -- we send only id, title, and description and let Product D's
// validator decide (it will reject events until Elliot's contract grows an
// event record type; this layer just makes the pipe exist). book_id is the
// contract's record-id field; the event id goes there so any future drafts key
// back to the right row.
export function mapEventToMarketingRecord(event: EventForMarketing): MarketingCatalogRecord {
  return {
    book_id: event.id,
    title: event.title,
    ...(event.description && { description: event.description }),
    promotional_tag: null,
  };
}

export function mapEventsToMarketingCatalog(events: EventForMarketing[]): MarketingCatalogRecord[] {
  return events.map(mapEventToMarketingRecord);
}
