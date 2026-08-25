import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Pagination } from "@/components/Pagination";
import type { Book, MarketingGenerationResult, PaginationMeta } from "@/types";

const PAGE_SIZE = 20;

export function MarketingContentPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<MarketingGenerationResult | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: pageMeta } = await api.getPaged<
        Book[],
        PaginationMeta
      >(`/books?page=${page}&limit=${PAGE_SIZE}`);
      setBooks(data);
      setMeta(pageMeta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load books");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  function toggleSelected(bookId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const generated = await api.post<MarketingGenerationResult>(
        "/marketing/generate",
        {
          bookIds: Array.from(selectedIds),
        },
      );
      setResult(generated);
      setSelectedIds(new Set());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to generate marketing content",
      );
    } finally {
      setGenerating(false);
    }
  }

  // Titles for whatever's in the current result, whether or not that book is
  // still on the page currently loaded (the selection that produced a result
  // may span pages, or the page may have moved on since).
  const titleByBookId = new Map(books.map((b) => [b.id, b.title]));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Marketing Content</h1>
        <button
          className="btn btn-primary"
          disabled={selectedIds.size === 0 || generating}
          onClick={() => void generate()}
        >
          {generating
            ? "Generating…"
            : `Generate for Selected (${selectedIds.size})`}
        </button>
      </div>
      <p>
        Pick books and generate promotional copy via Product D. A book needs a{" "}
        <em>description</em> and a <em>rating</em> set (Add/Edit Book) before it
        can generate -- see the results below for exactly which books were
        skipped and why.
      </p>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Author</th>
                <th>Rating</th>
                <th>Has Description</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${book.title}`}
                      checked={selectedIds.has(book.id)}
                      onChange={() => toggleSelected(book.id)}
                    />
                  </td>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.rating ?? "—"}</td>
                  <td>{book.description ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {result && (
        <div>
          <h2>Generated ({result.generated_drafts.length})</h2>
          {result.generated_drafts.length === 0 ? (
            <p>No books generated -- see rejections below.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Headline</th>
                  <th>Body Copy</th>
                </tr>
              </thead>
              <tbody>
                {result.generated_drafts.map((draft) => (
                  <tr key={draft.book_id}>
                    <td>{titleByBookId.get(draft.book_id) ?? draft.book_id}</td>
                    <td>{draft.headline}</td>
                    <td>{draft.body_copy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2>Not Generated ({result.summary.rejected_records})</h2>
          {result.summary.rejected_records === 0 ? (
            <p>Every selected book generated successfully.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {result.validation_diagnostics
                  .filter((d) => !d.valid)
                  .map((diagnostic) => (
                    <tr key={diagnostic.index}>
                      <td>
                        {(diagnostic.book_id &&
                          titleByBookId.get(diagnostic.book_id)) ??
                          diagnostic.book_id ??
                          `record #${diagnostic.index}`}
                      </td>
                      <td>
                        {diagnostic.errors.map((e) => e.message).join("; ")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
