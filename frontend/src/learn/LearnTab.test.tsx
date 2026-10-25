import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as analyzeApi from "../analyze/api";
import { LearnTab } from "./LearnTab";

vi.mock("../analyze/api");

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1";

const OVERVIEW = {
  positionNumber: 518,
  white: {
    undefendedPawnSquares: [],
    longDiagonalBishopSquares: [],
    castlingDistance: 0,
    weakestSquare: "c1",
    weakestSquareDefenders: 0,
  },
  black: {
    undefendedPawnSquares: [],
    longDiagonalBishopSquares: [],
    castlingDistance: 0,
    weakestSquare: "c8",
    weakestSquareDefenders: 0,
  },
};

const LEGAL_MOVES = [
  { from: "e2", to: "e4" },
  { from: "d2", to: "d4" },
];

function squareElements(square: string): Element[] {
  return Array.from(document.querySelectorAll(`[data-square="${square}"]`));
}

function isHighlighted(square: string, className: string): boolean {
  return squareElements(square).some((el) => el.classList.contains(className));
}

describe("LearnTab", () => {
  beforeEach(() => {
    vi.mocked(analyzeApi.fetchDailyPosition).mockResolvedValue({
      date: "2026-10-25",
      number: 518,
    });
    vi.mocked(analyzeApi.fetchStartingPosition).mockResolvedValue({
      fen: FEN,
      legalMoves: LEGAL_MOVES,
      turn: "white",
      status: "IN_PROGRESS",
      winner: null,
      overview: OVERVIEW,
      evaluation: { bestMoveUci: "d2d4", scoreCentipawns: 20, mateInMoves: null, depth: 10 },
    });
    vi.mocked(analyzeApi.playMove).mockResolvedValue({
      fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b HAha - 0 1",
      legalMoves: [],
      turn: "black",
      status: "IN_PROGRESS",
      winner: null,
      overview: OVERVIEW,
      evaluation: { bestMoveUci: null, scoreCentipawns: -15, mateInMoves: null, depth: 10 },
    });
  });

  it("highlights a clicked square right away, lets you change it before submitting, then reveals green/red", async () => {
    render(
      <MemoryRouter>
        <LearnTab />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
    await screen.findByText(/Click the White piece with the fewest defenders/);

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    // Click a square - it should highlight immediately, with nothing graded yet.
    fireEvent.click(squareElements("a1")[0]);
    expect(isHighlighted("a1", "square-selected")).toBe(true);
    expect(submit).toBeEnabled();
    expect(screen.queryByText(/weakest square is/)).not.toBeInTheDocument();

    // Change the choice before submitting - the old highlight should move.
    fireEvent.click(squareElements("f1")[0]);
    expect(isHighlighted("a1", "square-selected")).toBe(false);
    expect(isHighlighted("f1", "square-selected")).toBe(true);

    // Submit the (still wrong) answer: f1 in red, the actual answer c1 in green.
    fireEvent.click(submit);
    await screen.findByText(/the weakest square is c1/);
    expect(isHighlighted("c1", "square-marker-correct")).toBe(true);
    expect(isHighlighted("f1", "square-marker-incorrect")).toBe(true);

    // The board is frozen once answered - clicking elsewhere changes nothing.
    fireEvent.click(squareElements("g1")[0]);
    expect(isHighlighted("c1", "square-marker-correct")).toBe(true);
    expect(isHighlighted("f1", "square-marker-incorrect")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  });

  it("stages a proposed move without applying it, then grades it on submit", async () => {
    render(
      <MemoryRouter>
        <LearnTab />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
    await screen.findByText(/Click the White piece with the fewest defenders/);
    fireEvent.click(squareElements("c1")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText(/Correct!/);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText(/Find White's best first move/);
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    // Propose e2-e4: both squares highlight, but the move isn't applied yet.
    fireEvent.click(squareElements("e2")[0]);
    fireEvent.click(squareElements("e4")[0]);
    expect(isHighlighted("e2", "square-marker-selected")).toBe(true);
    expect(isHighlighted("e4", "square-marker-selected")).toBe(true);
    expect(analyzeApi.playMove).not.toHaveBeenCalled();
    expect(submit).toBeEnabled();

    // Submit grades it against Stockfish's line (d2-d4) and reveals both.
    fireEvent.click(submit);
    await waitFor(() => expect(analyzeApi.playMove).toHaveBeenCalledWith(FEN, "d2", "d4", undefined));
    await screen.findByText(/Stockfish's top choice was d2-d4, not e2-e4/);
    expect(isHighlighted("d2", "square-marker-correct")).toBe(true);
    expect(isHighlighted("d4", "square-marker-correct")).toBe(true);
    expect(isHighlighted("e2", "square-marker-incorrect")).toBe(true);
    expect(isHighlighted("e4", "square-marker-incorrect")).toBe(true);
  });
});
