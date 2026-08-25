import { describe, expect, it } from "vitest";
import { formatCatalog, parseCatalogText, SAMPLE_CATALOG } from "./catalog";

describe("catalog input helpers", () => {
  it("formats and parses the included sample catalog", () => {
    const text = formatCatalog(SAMPLE_CATALOG);

    expect(parseCatalogText(text)).toEqual(SAMPLE_CATALOG);
  });

  it("rejects empty, malformed, and non-array input", () => {
    expect(() => parseCatalogText("  ")).toThrow("Paste a catalog JSON array");
    expect(() => parseCatalogText("{not json")).toThrow("not valid JSON");
    expect(() => parseCatalogText('{"records": []}')).toThrow("top-level array");
  });
});
