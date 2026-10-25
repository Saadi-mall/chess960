import { useState } from "react";
import { Chessboard } from "./board/Chessboard";
import type { LegalMove } from "./board/types";
import "./App.css";

/**
 * Standard-start legal moves, hardcoded for now just to exercise the board (click/drag,
 * highlighting, promotion, the shuffle-in animation) before there's a server to ask.
 * Step 4 (Play tab) replaces this with real moves from the backend.
 */
const STANDARD_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1";
const STANDARD_LEGAL_MOVES: LegalMove[] = [
  ..."abcdefgh".split("").flatMap((file) => [
    { from: `${file}2`, to: `${file}3` },
    { from: `${file}2`, to: `${file}4` },
  ]),
  { from: "b1", to: "a3" },
  { from: "b1", to: "c3" },
  { from: "g1", to: "f3" },
  { from: "g1", to: "h3" },
];

const PROMOTION_DEMO_FEN = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";
const PROMOTION_DEMO_MOVES: LegalMove[] = (["q", "r", "b", "n"] as const).map((promotion) => ({
  from: "e7",
  to: "e8",
  promotion,
}));

const SHUFFLED_FEN = "bqnb1rkr/pppppppp/8/8/8/8/PPPPPPPP/BQNB1RKR w HFhf - 0 1";

type Demo = "start" | "promotion" | "shuffled";

function App() {
  const [demo, setDemo] = useState<Demo>("start");
  const [orientation, setOrientation] = useState<"w" | "b">("w");
  const [lastMove, setLastMove] = useState<LegalMove | null>(null);

  const { fen, legalMoves } =
    demo === "promotion"
      ? { fen: PROMOTION_DEMO_FEN, legalMoves: PROMOTION_DEMO_MOVES }
      : demo === "shuffled"
        ? { fen: SHUFFLED_FEN, legalMoves: [] }
        : { fen: STANDARD_START, legalMoves: STANDARD_LEGAL_MOVES };

  return (
    <main className="demo">
      <h1>Chess960</h1>
      <p className="demo-note">
        Board UI scaffold - moves below are hardcoded for testing, not server-provided yet.
      </p>
      <div className="demo-controls">
        <button onClick={() => setDemo("start")}>Standard start</button>
        <button onClick={() => setDemo("shuffled")}>Shuffled start (animate)</button>
        <button onClick={() => setDemo("promotion")}>Promotion</button>
        <button onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
          Flip board
        </button>
      </div>
      <Chessboard
        fen={fen}
        legalMoves={legalMoves}
        orientation={orientation}
        animateEntry={demo === "shuffled"}
        onMove={setLastMove}
      />
      {lastMove && (
        <p className="demo-note">
          Last move: {lastMove.from}-{lastMove.to}
          {lastMove.promotion ? `=${lastMove.promotion}` : ""}
        </p>
      )}
    </main>
  );
}

export default App;
