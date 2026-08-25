import type { MarketingCatalogRecord } from "@/lib/marketing/catalog-mapper";

// Mirrors CatalogGenerationResult.as_dict() in
// apps/content-generator/src/riverside_marketing/orchestration.py -- passed
// through to our caller as-is rather than reshaped, so staff see exactly
// which records generated and which were rejected (and why), same as the
// Python service's own callers do.
export type MarketingGenerationResult = {
  generated_drafts: unknown[];
  rejected_records: unknown[];
  validation_diagnostics: unknown[];
  summary: {
    total_records: number;
    valid_records: number;
    rejected_records: number;
    generated_drafts: number;
  };
};

export class ContentGeneratorError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Read lazily (not at module load, like lib/stripe.ts) so routes that don't
// touch marketing generation -- and the build itself -- never require this to
// be set. Points at the vendored apps/content-generator FastAPI service,
// wherever it's deployed (or http://localhost:8000 in local dev).
function getContentGeneratorUrl(): string {
  const url = process.env.CONTENT_GENERATOR_URL;
  if (!url) {
    throw new ContentGeneratorError(
      "CONTENT_GENERATOR_URL must be set to generate marketing content",
      503,
    );
  }
  return url.replace(/\/+$/, "");
}

export async function generateMarketingContent(
  catalog: MarketingCatalogRecord[],
): Promise<MarketingGenerationResult> {
  const response = await fetch(`${getContentGeneratorUrl()}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catalog),
  });

  if (!response.ok) {
    throw new ContentGeneratorError(`Content generator returned ${response.status}`, 502);
  }

  return response.json() as Promise<MarketingGenerationResult>;
}
