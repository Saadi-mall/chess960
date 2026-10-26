import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as lessonApi from "./api";
import { LearnTab } from "./LearnTab";
import type { Lesson } from "./types";

vi.mock("./api");

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1";
const move = (from: string, to: string, san: string) => ({ from, to, promotion: null, san, arrowTo: to });

const LESSON: Lesson = {
  date: "2026-10-26",
  number: 518,
  fen: FEN,
  evaluation: "+0.25",
  features: [
    { title: "The verdict", text: "Stockfish rates the starting position +0.25.", arrows: [], squares: [] },
    { title: "Kings and castling", text: "White's king starts on e1.", arrows: [{ from: "e1", to: "g1", color: "feature" }], squares: ["e1"] },
  ],
  weakestPawn: { question: "Which of White's pawns is the weakest?", answers: ["f2"], explanation: "f2 is White's weakest pawn." },
  whiteMoves: {
    fen: FEN,
    sideToMove: "white",
    prompt: "Find White's three best first moves, in any order.",
    bestMoves: [
      { ...move("e2", "e4", "e4"), score: "+0.25" },
      { ...move("d2", "d4", "d4"), score: "+0.22" },
      { ...move("g1", "f3", "Nf3"), score: "+0.20" },
    ],
    legalMoves: [move("e2", "e4", "e4"), move("d2", "d4", "d4"), move("g1", "f3", "Nf3"), move("c2", "c4", "c4"), move("a2", "a3", "a3")],
  },
  blackMoves: {
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b HAha - 0 1",
    sideToMove: "black",
    prompt: "After 1. e4, find Black's three best replies, in any order.",
    bestMoves: [],
    legalMoves: [],
  },
  mainLine: "1. e4 e5",
  mainLineMoves: ["e4", "e5"],
  mainLineFens: [FEN, FEN, FEN],
  mainLineSquares: [
    { from: "e2", to: "e4" },
    { from: "e7", to: "e5" },
  ],
  plans: [],
};

const square = (sq: string) => document.querySelector(`rect[data-square="${sq}"]`)!;
const highlighted = (sq: string, cls: string) =>
  Array.from(document.querySelectorAll(`[data-square="${sq}"]`)).some((el) => el.classList.contains(cls));

async function startQuestions() {
  render(
    <MemoryRouter>
      <LearnTab />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Start the questions" }));
}

describe("LearnTab", () => {
  beforeEach(() => {
    vi.mocked(lessonApi.fetchLesson).mockResolvedValue(LESSON);
  });

  it("explains the features first, with the selected feature's arrows on the board", async () => {
    render(
      <MemoryRouter>
        <LearnTab />
      </MemoryRouter>,
    );
    await screen.findByText("Kings and castling");
    expect(document.querySelector('[data-arrow="e1-g1"]')).not.toBeNull();

    fireEvent.click(screen.getByText("The verdict"));
    expect(document.querySelector('[data-arrow="e1-g1"]')).toBeNull();
  });

  it("only accepts a pawn, lets you change it, then grades it", async () => {
    await startQuestions();
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    fireEvent.click(square("e1"));
    expect(screen.getByText("Pick one of White's pawns.")).toBeInTheDocument();
    expect(submit).toBeDisabled();

    fireEvent.click(square("a2"));
    expect(highlighted("a2", "square-marker-selected")).toBe(true);
    fireEvent.click(square("h2"));
    expect(highlighted("a2", "square-marker-selected")).toBe(false);
    expect(highlighted("h2", "square-marker-selected")).toBe(true);

    fireEvent.click(submit);
    expect(screen.getByText(/Not quite - you picked h2/)).toBeInTheDocument();
    expect(highlighted("f2", "square-marker-correct")).toBe(true);
    expect(highlighted("h2", "square-marker-incorrect")).toBe(true);
  });

  it("collects three best-move guesses in any order and grades each one", async () => {
    await startQuestions();
    fireEvent.click(square("f2"));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const play = (from: string, to: string) => {
      fireEvent.click(square(from));
      fireEvent.click(square(to));
    };
    play("g1", "f3");
    play("c2", "c4");
    play("e2", "e4");
    expect(screen.getByRole("button", { name: "Submit 3/3" })).toBeEnabled();
    expect(document.querySelector('[data-arrow="g1-f3"]')!.classList.contains("arrow-guess")).toBe(true);

    // Change one guess: drop c4 (not a top move), play a3 (also not one) instead.
    fireEvent.click(screen.getByRole("button", { name: "Remove c4" }));
    expect(screen.getByRole("button", { name: "Submit 2/3" })).toBeDisabled();
    play("a2", "a3");
    fireEvent.click(screen.getByRole("button", { name: "Submit 3/3" }));

    expect(screen.getByText("You found 2 of Stockfish's top 3.")).toBeInTheDocument();
    expect(screen.getByText(/Not in the top 3: a3/)).toBeInTheDocument();
    expect(document.querySelector('[data-arrow="d2-d4"]')!.classList.contains("arrow-good")).toBe(true);
    expect(document.querySelector('[data-arrow="a2-a3"]')!.classList.contains("arrow-bad")).toBe(true);
  });
});
