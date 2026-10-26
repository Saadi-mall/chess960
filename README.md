# Chess960

A Chess960 (Fischer Random) web app: play it live with a friend, set up any starting
position and analyze it with Stockfish, or work through a daily lesson - optionally with an
account that keeps your streak and results.

Built for a Chess.com take-home. See [docs/DECISIONS.md](docs/DECISIONS.md) for the main
design decisions, trade-offs, time breakdown, and what's next; see
[k8s/README.md](k8s/README.md) for running it on Kubernetes instead of Docker Compose, and
[docs/DEPLOY.md](docs/DEPLOY.md) for hosting it for free on Vercel + Render + Supabase.

## Run it

```bash
docker compose up --build
```

Then open **http://localhost:3000**. That's the whole setup - one command brings up
Postgres, the Java backend (with Stockfish installed inside its container), and the React
frontend together.

The backend alone is reachable at `http://localhost:8080` if you want to hit its REST API
directly; Postgres is exposed on `5432` for the same reason. Neither needs to be touched
for normal use - the frontend talks to the backend through nginx, which proxies `/api` and
`/ws` to it.

## What it does

- **Play** - create a game (a random Chess960 position, a chosen number 0-959, or today's
  lesson position), pick a time control, and share a link with a friend. Live play over
  WebSockets: the server validates every move, runs the clocks, and detects every way a
  game can end (checkmate, stalemate, insufficient material, the 50-move rule, threefold
  repetition, resignation, timeout). Supports resigning, draw offers, and rematches (with
  colors swapped), and rejoining after a refresh.
- **Analyze** - set up any of the 960 legal starting positions, see an overview card of
  computed facts about it (undefended pawns, bishops already on a long diagonal, how many
  of each side's own pieces are blocking their fastest castling route, a weakest-square
  score), then play out moves against a live Stockfish evaluation.
- **Learn** - one daily position, the same for everyone, picked deterministically from the
  date. The lesson explains the position's key features (castling routes, long-diagonal
  bishops and what they're aimed at, undefended pawns) with arrows on the board, asks for
  the weakest pawn, asks you to find Stockfish's three best moves for White and then
  Black's three best replies (in any order), and finishes with both sides' plans from
  Stockfish's main line drawn as arrows. Every sentence is a template filled with computed
  data or Stockfish's actual choices. Then a button to play that position with a friend.
- **Accounts** - sign up with an email and password to keep your daily-lesson streak and
  results on the server (`/progress`); signed-in answers are graded by the server. Guests
  keep a streak in their browser instead.
- **Chess.com stats** (optional, its own tab) - look up a Chess.com
  player's public game history and see simple Chess960 stats: total games, win/loss/draw,
  win rate, and a breakdown by time class.

## Credits

The piece set is ["Cburnett"](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
by Colin M. L. Burnett, licensed
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.en). Used unmodified,
via [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett)
(itself redistributing the original files under the same license); the SVGs live at
`frontend/public/pieces/cburnett/`. No other third-party visual assets are used - the board
itself is custom SVG and the UI typeface is [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4)
from Google Fonts (SIL Open Font License).

## Stack

Java 21 + Spring Boot (REST + WebSocket) for the backend, a hand-written Chess960 move
generator (no chess library - see [docs/DECISIONS.md](docs/DECISIONS.md)), PostgreSQL with
Flyway migrations, Stockfish running inside the backend container, React + TypeScript
(Vite) with plain CSS for the frontend, Docker Compose for local dev, Kubernetes manifests
in `k8s/` for a cluster deployment.

## Running the tests

Backend (100 tests - the rules engine's perft suite, castling edge cases, SAN notation, lesson building and grading, accounts and streaks, the position
analyzer, the game/clock/draw/rematch logic, the Stockfish UCI wrapper against the real
binary, and the Chess.com import's classification logic):

```bash
cd backend
mvn test
```

This needs a JDK 21 and a `stockfish` binary on your `PATH` (`brew install stockfish` on
macOS); without Stockfish, everything except `StockfishEngineTest` still passes.

Frontend (type checking, linting, a production build, and a small Vitest + React Testing
Library suite covering the Learn tab's quiz interaction and the move-list back/forward
logic - everything else was verified
manually in-browser through each tab, including click-to-move, drag-to-move, the promotion
picker, board flipping, and mobile widths):

```bash
cd frontend
npm install
npm run build   # tsc -b && vite build
npx oxlint
npm test        # vitest run
```

## Project layout

```
backend/    Spring Boot app: rules engine, game server, position analyzer,
            Stockfish integration, Chess.com import, REST + WebSocket APIs
frontend/   React + TypeScript app: the board, and the Play/Analyze/Learn tabs
k8s/        Kubernetes manifests (see k8s/README.md)
docs/       Decisions, trade-offs, and the time log this app was built with
```
