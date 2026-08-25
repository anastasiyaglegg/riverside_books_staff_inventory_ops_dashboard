import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaginationControls } from "@/components/PaginationControls";

describe("PaginationControls", () => {
  it("renders greyed-out controls when there's only one page", () => {
    render(<PaginationControls currentPage={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(screen.getByLabelText("First page")).toBeDisabled();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
    expect(screen.getByLabelText("Next page")).toBeDisabled();
    expect(screen.getByLabelText("Last page")).toBeDisabled();
    expect(screen.getByLabelText("Go to page")).toBeDisabled();
    expect(screen.getByText("Go")).toBeDisabled();
  });

  it("disables First/Back on the first page and Next/Last on the last page", () => {
    render(<PaginationControls currentPage={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText("First page")).toBeDisabled();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
    expect(screen.getByLabelText("Next page")).not.toBeDisabled();
    expect(screen.getByLabelText("Last page")).not.toBeDisabled();
  });

  it("calls onPageChange with the target page for each control", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<PaginationControls currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByLabelText("Next page"));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    await user.click(screen.getByLabelText("Previous page"));
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByLabelText("First page"));
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByLabelText("Last page"));
    expect(onPageChange).toHaveBeenLastCalledWith(5);
  });

  it("jumps to the page typed into the jump-to-page field", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<PaginationControls currentPage={1} totalPages={10} onPageChange={onPageChange} />);

    const jumpInput = screen.getByLabelText("Go to page");
    await user.clear(jumpInput);
    await user.type(jumpInput, "7");
    await user.click(screen.getByText("Go"));

    expect(onPageChange).toHaveBeenCalledWith(7);
  });

  it("clamps an out-of-range jump target into bounds", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<PaginationControls currentPage={1} totalPages={5} onPageChange={onPageChange} />);

    const jumpInput = screen.getByLabelText("Go to page");
    await user.clear(jumpInput);
    await user.type(jumpInput, "999");
    await user.click(screen.getByText("Go"));

    expect(onPageChange).toHaveBeenCalledWith(5);
  });
});
