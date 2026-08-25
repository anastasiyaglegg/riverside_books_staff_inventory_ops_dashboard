import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOpenLibraryCoverUrl } from "@/lib/book-cover";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

describe("fetchOpenLibraryCoverUrl", () => {
  it("builds a cover URL from the first result's cover_i", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({ docs: [{ cover_i: 12345 }] }));
    vi.stubGlobal("fetch", fetchMock);

    const url = await fetchOpenLibraryCoverUrl("The Great Gatsby", "F. Scott Fitzgerald");

    expect(url).toBe("https://covers.openlibrary.org/b/id/12345-M.jpg");
    const requestedUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(requestedUrl).toContain("openlibrary.org/search.json");
    expect(requestedUrl).toContain("title=The+Great+Gatsby");
  });

  it("returns null and caches the miss when no doc has a cover", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({ docs: [{}] }));
    vi.stubGlobal("fetch", fetchMock);

    const url = await fetchOpenLibraryCoverUrl("Some Obscure Title", "Some Author");
    expect(url).toBeNull();

    // Second call should hit the cache, not fetch again.
    const url2 = await fetchOpenLibraryCoverUrl("Some Obscure Title", "Some Author");
    expect(url2).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves a cached hit without calling fetch again", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({ docs: [{ cover_i: 999 }] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchOpenLibraryCoverUrl("Dune", "Frank Herbert");
    const url = await fetchOpenLibraryCoverUrl("Dune", "Frank Herbert");

    expect(url).toBe("https://covers.openlibrary.org/b/id/999-M.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null without caching on a network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const url = await fetchOpenLibraryCoverUrl("Flaky Book", "Author");
    expect(url).toBeNull();
    expect(localStorage.getItem("riverside_cover:flaky book|author")).toBeNull();
  });

  it("returns null when the response isn't ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }));

    const url = await fetchOpenLibraryCoverUrl("Rate Limited Book", "Author");
    expect(url).toBeNull();
  });

  it("de-duplicates concurrent lookups for the same title/author into one request", async () => {
    let resolveResponse!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveResponse = resolve; }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const firstCall = fetchOpenLibraryCoverUrl("Concurrent Book", "Author");
    const secondCall = fetchOpenLibraryCoverUrl("Concurrent Book", "Author");

    resolveResponse(await jsonResponse({ docs: [{ cover_i: 42 }] }));
    const [firstUrl, secondUrl] = await Promise.all([firstCall, secondCall]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstUrl).toBe("https://covers.openlibrary.org/b/id/42-M.jpg");
    expect(secondUrl).toBe(firstUrl);
  });
});
