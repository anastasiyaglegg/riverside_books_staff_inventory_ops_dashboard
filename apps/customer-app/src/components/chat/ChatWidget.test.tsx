import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ChatWidget } from "@/components/chat/ChatWidget";

function jsonResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ChatWidget", () => {
  it("renders as a closed launcher button by default", () => {
    render(
      <MemoryRouter>
        <ChatWidget />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
    expect(screen.queryByLabelText("Chat message")).not.toBeInTheDocument();
  });

  it("opens the panel and shows suggested questions", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ChatWidget />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("Open chat"));

    expect(screen.getByLabelText("Chat message")).toBeInTheDocument();
    expect(screen.getByText("What time do you close Sunday?")).toBeInTheDocument();
  });

  it("sends a message and renders the assistant's reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        jsonResponse({
          reply: "We're open until 6pm on Sundays.",
          cards: [],
          sample: null,
          handoff: false,
          session_id: "s1",
        }),
      ),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ChatWidget />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText("Open chat"));
    await user.type(screen.getByLabelText("Chat message"), "What time do you close?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("We're open until 6pm on Sundays."),
    ).toBeInTheDocument();
  });
});
