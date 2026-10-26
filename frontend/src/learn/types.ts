/** Mirrors the backend's Lesson record - see LessonBuilder for how each field is computed. */

export interface LessonArrow {
  from: string;
  to: string;
  color: "feature" | "white" | "black";
}

export interface LessonFeature {
  title: string;
  text: string;
  arrows: LessonArrow[];
  squares: string[];
}

/** One of Stockfish's top moves; from/to/promotion match the board's legal-move encoding. */
export interface CandidateMove {
  san: string;
  from: string;
  to: string;
  promotion: string | null;
  arrowTo: string;
  score: string;
}

export interface LegalMoveSan {
  from: string;
  to: string;
  promotion: string | null;
  san: string;
  arrowTo: string;
}

export interface MoveQuiz {
  fen: string;
  sideToMove: "white" | "black";
  prompt: string;
  bestMoves: CandidateMove[];
  legalMoves: LegalMoveSan[];
}

export interface Plan {
  side: "white" | "black";
  moves: string[];
  arrows: LessonArrow[];
  text: string;
}

export interface Lesson {
  date: string;
  number: number;
  fen: string;
  evaluation: string;
  features: LessonFeature[];
  weakestPawn: { question: string; answers: string[]; explanation: string };
  whiteMoves: MoveQuiz;
  blackMoves: MoveQuiz;
  mainLine: string;
  mainLineMoves: string[];
  mainLineFens: string[];
  plans: Plan[];
}

/** How the learner did - recorded when they reach the end of the lesson. */
export interface LessonResult {
  date: string;
  weakestPawnCorrect: boolean;
  whiteFound: number;
  blackFound: number;
}
