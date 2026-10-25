# Time log

Working log kept while building, folded into the time breakdown in the final
submission notes. Times are wall-clock, AI-assisted (see docs/DECISIONS.md).

| Step | Start | End | Notes |
|---|---|---|---|
| 1. Scaffold + docker compose up --build | 2026-10-24 21:39 | 2026-10-24 21:48 | Repo init, Spring Boot + Vite/React scaffolds, Postgres via compose, nginx reverse proxy, local JDK 21/Maven install, end-to-end health check verified in-browser. |
| 2. Rules engine, perft, castling tests | 2026-10-24 21:48 | 2026-10-24 22:00 | Board/move/FEN model, Chess960 castling (king-captures-rook, Shredder-FEN rights), move generator. Found real perft numbers (standard + Chess960 positions) on chessprogramming.org rather than guessing. One real bug caught by perft: capturing any piece on a castling rook's file (not just the rook) was wrongly clearing that castling right. |
| 3. Board UI | 2026-10-24 22:00 | 2026-10-24 22:07 | Design tokens (warm paper theme, serif headings, dark mode), custom SVG board using Unicode piece glyphs (no external art, keeps "custom board" self-contained), click and drag moves, legal-move highlighting, promotion picker, back-rank shuffle-in animation, mobile layout. Manually exercised in-browser. Two real UI bugs found and fixed while testing: piece colors reused the light/dark theme tokens (white and black pieces looked identical in dark mode); clicking an occupied destination square (a capture) hit the piece's own click handler instead of completing the move. |
