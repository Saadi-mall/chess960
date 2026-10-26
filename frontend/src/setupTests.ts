import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement scrolling; the move list scrolls the current move into view.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
