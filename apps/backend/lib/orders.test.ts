import { describe, it, expect } from "vitest";
import { isValidOrderStatusTransition } from "./orders";

describe("isValidOrderStatusTransition", () => {
  it("allows placed -> ready_for_pickup", () => {
    expect(isValidOrderStatusTransition("placed", "ready_for_pickup")).toBe(true);
  });

  it("allows placed -> cancelled", () => {
    expect(isValidOrderStatusTransition("placed", "cancelled")).toBe(true);
  });

  it("allows ready_for_pickup -> completed", () => {
    expect(isValidOrderStatusTransition("ready_for_pickup", "completed")).toBe(true);
  });

  it("allows ready_for_pickup -> cancelled", () => {
    expect(isValidOrderStatusTransition("ready_for_pickup", "cancelled")).toBe(true);
  });

  it("rejects skipping ready_for_pickup (placed -> completed)", () => {
    expect(isValidOrderStatusTransition("placed", "completed")).toBe(false);
  });

  it("rejects any transition out of completed", () => {
    expect(isValidOrderStatusTransition("completed", "placed")).toBe(false);
    expect(isValidOrderStatusTransition("completed", "ready_for_pickup")).toBe(false);
    expect(isValidOrderStatusTransition("completed", "cancelled")).toBe(false);
  });

  it("rejects any transition out of cancelled", () => {
    expect(isValidOrderStatusTransition("cancelled", "placed")).toBe(false);
    expect(isValidOrderStatusTransition("cancelled", "ready_for_pickup")).toBe(false);
    expect(isValidOrderStatusTransition("cancelled", "completed")).toBe(false);
  });
});
