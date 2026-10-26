import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotationPanel } from "./NotationPanel";
import { useHistoryNav } from "./useHistoryNav";

const MOVES = ["e4", "e5", "Nf3", "Nc6"];

function Harness() {
  const nav = useHistoryNav(MOVES.length);
  return (
    <>
      <span data-testid="ply">{nav.ply}</span>
      <input aria-label="a text field" />
      <NotationPanel moves={MOVES} nav={nav} onFlip={() => {}} />
    </>
  );
}

const ply = () => screen.getByTestId("ply").textContent;

describe("NotationPanel keyboard", () => {
  it("steps through the moves with the arrow keys", () => {
    render(<Harness />);
    expect(ply()).toBe("4");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(ply()).toBe("2");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(ply()).toBe("3");

    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(ply()).toBe("0");

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(ply()).toBe("4");
  });

  it("leaves the keys alone while typing in a field", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByLabelText("a text field"), { key: "ArrowLeft" });
    expect(ply()).toBe("4");
  });
});
