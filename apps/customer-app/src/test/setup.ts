import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement scrollIntoView -- used by ChatWidget to keep the
// latest message in view.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
