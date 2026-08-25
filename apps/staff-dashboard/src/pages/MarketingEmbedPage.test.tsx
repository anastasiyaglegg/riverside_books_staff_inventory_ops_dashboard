import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingEmbedPage } from "@/pages/MarketingEmbedPage";

describe("MarketingEmbedPage", () => {
  it("embeds the marketing generator frontend and offers an open-in-new-tab link", () => {
    render(<MarketingEmbedPage />);

    const frame = screen.getByTitle("Riverside Marketing Content Generator");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toContain(
      "riverside-marketing-content-generat",
    );

    const link = screen.getByRole("link", { name: /open in new tab/i });
    expect(link).toHaveAttribute("target", "_blank");
  });
});
