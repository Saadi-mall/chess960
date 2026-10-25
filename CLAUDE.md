# Chess960 app

A Chess960 web app for a Chess.com take-home. I have to explain this code in an interview, so keep it simple and readable, and comment the chess rules logic.

## What it does

Three tabs:

- **Play**: create a game (random position, a chosen number 0-959, or today's lesson position), pick a time control (default 5+0), and share a link with a friend. Live play over WebSockets. The server validates moves, runs the clocks, and detects every way a game can end. Support resign, draw offers, rematch, and rejoining after a refresh.
- **Analyze**: set up any legal 960 starting position, see an overview card of facts about it, then make moves with a Stockfish evaluation.
- **Learn**: one daily position (same for everyone, picked from the date). A short lesson: overview card, find the weakest square, find White's best first move, find Black's best reply, then a button to play it with a friend. Keep a daily streak using an anonymous ID in localStorage. Lesson text comes from templates filled with computed data, never made-up chess claims.

Optional if there is time: import a user's Chess.com 960 games with the public read-only API and show simple stats.

## Key decisions

- Write the move generator myself in Java. No chess library. Use a simple 8x8 or 0x88 board.
- Chess960 castling must be fully correct. Represent castling as the king capturing its own rook, and use Shredder-FEN for castling rights.
- Test the move generator with perft. Use real published numbers (standard position plus Chess960 positions from the Chess Programming Wiki). Never guess them. Ask me if you cannot find them.
- The server sends legal moves to the frontend. The frontend does not compute chess rules.
- Stockfish runs inside the backend container with UCI_Chess960 on. Cache starting-position analysis in Postgres.
- The position overview card is computed by a Java analyzer: position number (518 is normal chess), undefended pawns, long-diagonal bishops, how far each side is from castling, and a simple weakest-square score.

## Stack

Java 21 + Spring Boot, PostgreSQL with Flyway, React + TypeScript (Vite) with plain CSS. Docker Compose so `docker compose up --build` runs everything. Kubernetes manifests in `k8s/`.

## Design

It should look like a clean chess publication, not a template. No gradients, glass effects, emoji or generic card grids. Warm light background, dark text, one accent color, dark mode, a serif font for headings. Custom SVG board with drag and click moves. When a position loads, animate the back rank pieces shuffling into place. Works on mobile.

## Build order

Finish and test each step before the next. Commit after each one.

1. Scaffold the repo and get `docker compose up --build` working.
2. Rules engine with perft and castling tests.
3. Board UI.
4. Play tab with multiplayer.
5. Position analyzer.
6. Stockfish integration.
7. Analyze tab.
8. Learn tab.
9. Chess.com import (cut this first if short on time).
10. Kubernetes manifests.
11. README with one-command setup, and docs/DECISIONS.md with trade-offs and next steps.

Do not add features beyond this. If something is unclear, ask me.
