import { useState, type FormEvent } from "react";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const [pageInput, setPageInput] = useState("");

  function goToPage(target: number) {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    if (clamped !== page) onPageChange(clamped);
  }

  function handleJump(e: FormEvent) {
    e.preventDefault();
    const target = Number(pageInput);
    if (!Number.isInteger(target) || target < 1) return;
    goToPage(target);
    setPageInput("");
  }

  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-secondary"
        aria-label="Skip to first page"
        disabled={atFirst}
        onClick={() => goToPage(1)}
      >
        «
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        aria-label="Previous page"
        disabled={atFirst}
        onClick={() => goToPage(page - 1)}
      >
        ‹
      </button>
      <span className="pagination-status">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        aria-label="Next page"
        disabled={atLast}
        onClick={() => goToPage(page + 1)}
      >
        ›
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        aria-label="Skip to last page"
        disabled={atLast}
        onClick={() => goToPage(totalPages)}
      >
        »
      </button>
      <form className="pagination-jump" onSubmit={handleJump}>
        <input
          type="number"
          min={1}
          className="pagination-jump-input"
          placeholder="Page #"
          aria-label="Go to page"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">
          Go
        </button>
      </form>
    </div>
  );
}
