import { describe, expect, it } from "vitest";
import { kingToMoveSquare, sanGivesCheck } from "./fen";
import { materialFromFen } from "./material";

describe("materialFromFen", () => {
  it("is level at the start", () => {
    const m = materialFromFen("bqnbrknr/pppppppp/8/8/8/8/PPPPPPPP/BQNBRKNR w HEhe - 0 1");
    expect(m.white).toEqual({ captured: [], lead: 0 });
    expect(m.black).toEqual({ captured: [], lead: 0 });
  });

  it("lists what each side took and who is ahead", () => {
    // White has taken a bishop and a pawn; Black has taken a pawn. White is +3.
    const m = materialFromFen("1qnbrknr/ppppppp1/8/8/8/8/PPPPPPP1/BQNBRKNR b HEhe - 0 1");
    expect(m.white).toEqual({ captured: ["b", "p"], lead: 3 });
    expect(m.black).toEqual({ captured: ["P"], lead: 0 });
  });

  it("counts the lead from the board after a promotion", () => {
    // Only kings, pawns and White's two queens (one promoted): 2*9 + 7 pawns vs 8 pawns.
    const m = materialFromFen("4k3/pppppppp/8/8/8/8/1PPPPPPP/QQ2K3 w - - 0 1");
    expect(m.white.lead).toBe(17);
    expect(m.black.lead).toBe(0);
  });
});

describe("check helpers", () => {
  it("reads check from the server's SAN", () => {
    expect(sanGivesCheck("Qxf7#")).toBe(true);
    expect(sanGivesCheck("Bb5+")).toBe(true);
    expect(sanGivesCheck("O-O")).toBe(false);
    expect(sanGivesCheck(undefined)).toBe(false);
  });

  it("finds the king of the side to move", () => {
    const fen = "bqnbrknr/pppppppp/8/8/8/8/PPPPPPPP/BQNBRKNR b HEhe - 0 1";
    expect(kingToMoveSquare(fen)).toBe("f8");
    expect(kingToMoveSquare(fen.replace(" b ", " w "))).toBe("f1");
  });
});
