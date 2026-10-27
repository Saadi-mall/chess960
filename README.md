# Chess960

A web app for Chess960 (also called Fischer Random): chess where the pieces on the back
rank start in one of 960 shuffled positions. You can play a friend live, analyze any
starting position with Stockfish, and work through a short daily lesson.

Built as a take-home project for Chess.com. The chess rules engine is written from scratch
in Java (no chess library).

## Two ways to try it

Both run exactly the same code. You only need one of them.

### Option 1: the live site (nothing to install)

Open **https://chess960-rho.vercel.app**

**The first load can take up to a minute.** The backend runs on Render's free plan, which
puts the server to sleep after 15 minutes without visitors. The first request after that
wakes it up, which takes about 30-60 seconds. In practice:

- If nobody has used the site in the last 15 minutes (likely when you first open it), the
  page itself appears right away, but the board, lesson or game can sit on "Loading" or
  "Connecting" until the server is awake. If something shows an error during that first
  minute, refresh once it's up.
- Once it's awake, everything is full speed for as long as anyone is using the site.
- If you leave and come back more than 15 minutes later, the same wait happens again.
  An open game keeps the server awake on its own (the page pings it every 4 minutes), so
  this never interrupts a game in progress.
- Games and the daily lesson are held in the server's memory, so a sleep clears any
  finished or abandoned games. Accounts and saved progress are in the database and are
  not affected.

To wake the server before you start, open
https://chess960-backend.onrender.com/actuator/health and wait until it shows
`{"status":"UP"}`.

### Option 2: on your own machine with Docker

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker with
the Compose plugin). From the repository's root folder, run:

```bash
docker compose up --build
```

Then open **http://localhost:3000**.

This one command starts everything: the database, the Java backend (with Stockfish inside
its container), and the website. The first build takes a few minutes because it downloads
Java and Node dependencies; later starts are quick. Nothing sleeps when you run it this
way.

- Stop it with `Ctrl+C`, or `docker compose down` from another terminal.
- To also wipe the database (accounts, progress, cached evaluations):
  `docker compose down -v`.
- It uses ports **3000** (website), **8080** (backend API) and **5432** (Postgres). If one
  of those is already in use on your machine, stop whatever is using it first.

### Playing a friend in either version

Create a game on the **Play** tab and send the invite link. To try it alone, open the link
in a second browser tab or window: each tab holds its own seat, so the second tab joins as
the other color.

### Accounts

Accounts are optional. Without one, your lesson streak is saved in your browser. With one
(**Sign up**, top right), your streak and lesson results are kept on the server and show
on the **Progress** page. Signing up needs only an email, a display name and a password,
and you're signed in straight away, both on the live site and locally. (The code also
supports confirming the email address first; that turns on only when an email service is
configured. See [docs/DEPLOY.md](docs/DEPLOY.md).)

## What's in it

- **Play**: start a game from a random position, a position number (0-959), or today's
  lesson position, with a time control (5+0 by default). Moves are made by dragging or
  clicking, and legal moves are shown as dots. The server checks every move, runs the
  clocks, and detects every way a game can end: checkmate, stalemate, insufficient
  material, the 50-move rule, threefold repetition, resignation and timeout. You can
  resign, offer a draw, ask for a rematch (colors swap), refresh without losing your seat,
  and open a finished game in Analyze. A king in check is highlighted, each player's bar
  shows the pieces they've captured and their material lead (for example +3), and a green
  dot shows whether each player is connected.
- **Analyze**: pick any of the 960 starting positions and see an overview card of facts
  about it: its number (518 is the normal chess setup), undefended pawns, bishops on a long
  diagonal, how many pieces block each side's castling, and the weakest square. Then play
  moves on the board with a live Stockfish evaluation.
- **Learn**: one position a day, the same for everyone. The lesson walks through the
  position's key features with arrows on the board, asks for the weakest pawn, asks for
  White's three best moves and Black's three best replies (any order), then shows both
  sides' plans from Stockfish's main line. Every sentence is a template filled with
  computed data or Stockfish's actual moves, never invented chess advice. A button at the
  end starts a game from that position.
- **Chess.com stats**: enter a Chess.com username to see that player's Chess960 record
  (games, wins, losses, draws, win rate, and a breakdown by time control), read from
  Chess.com's public API.

## Technology used

| Technology | What it's used for |
| --- | --- |
| Java 21 | The backend language, including the hand-written chess rules engine |
| Spring Boot 3 | The backend web server: REST API, WebSockets for live games, database access |
| PostgreSQL 16 | Stores accounts, login sessions, lesson results, and cached Stockfish evaluations |
| Flyway | Creates and updates the database tables from versioned SQL files |
| Stockfish | The chess engine behind evaluations and lessons, run inside the backend container in Chess960 mode |
| BCrypt (`spring-security-crypto`) | Hashing passwords |
| React 19 + TypeScript | The frontend |
| Vite | Builds the frontend and runs it during development |
| React Router | Page addresses (`/play`, `/analyze`, `/learn`, and so on) |
| Plain CSS | All styling, with no UI library; the chessboard is a custom SVG |
| JUnit 5 + Mockito | Backend tests |
| Vitest + React Testing Library | Frontend tests |
| oxlint | Frontend linting |
| Docker + Docker Compose | Runs the whole app locally with one command |
| nginx | Serves the built frontend in Docker and forwards `/api` and `/ws` to the backend |
| Kubernetes | Example manifests for running it on a cluster (`k8s/`, not used by the live site) |
| Vercel | Hosts the live frontend |
| Render | Hosts the live backend (free plan) |
| Supabase | Hosts the live PostgreSQL database |
| Chess.com public API | Data for the Chess.com stats page |

## How it fits together

```
Browser (React)
   |  REST:   /api/...       moves, positions, analysis, lessons, accounts
   |  WebSocket: /ws/games/  live games (moves, clocks, draw offers, rematches)
   v
Backend (Spring Boot) ----> Stockfish (a separate process, started per evaluation)
   |
   v
PostgreSQL
```

The browser never decides what is legal. It asks the server for the legal moves and only
offers those. Live games are kept in the backend's memory; Postgres holds only what has to
last (accounts, progress, and the evaluations of the 960 starting positions, which are slow
to compute and requested often).

## Where to find things in the code

| What | Where |
| --- | --- |
| Board, moves, FEN, move generation | `backend/src/main/java/com/chess960/backend/rules/` |
| Chess960 castling (the king "captures" its own rook) | `rules/MoveGenerator.java` (finding castling moves), `rules/Position.java` (playing them), `rules/CastlingRights.java` and `rules/Fen.java` (Shredder-FEN rights) |
| Numbering the 960 starting positions | `rules/Chess960StartingPosition.java` |
| Move notation (SAN, e.g. `Nf3`, `O-O`) | `rules/San.java` |
| Live games: clocks, results, draw offers, rematches | `game/Game.java`, `game/ws/GameWebSocketHandler.java` |
| The Analyze overview card | `analysis/PositionAnalyzer.java` |
| Stockfish | `engine/StockfishEngine.java` |
| Daily lesson | `lesson/LessonBuilder.java`, `lesson/LessonService.java` |
| Accounts and streaks | `account/` |
| Database tables | `backend/src/main/resources/db/migration/` |
| The chessboard | `frontend/src/board/Chessboard.tsx` |
| The three tabs | `frontend/src/play/`, `frontend/src/analyze/`, `frontend/src/learn/` |
| Shared page layout (player bars, move list) | `frontend/src/layout/` |

The backend paths above are relative to `backend/src/main/java/com/chess960/backend/`.

## Running the tests

**Backend** (108 tests): the perft suite that checks the move generator against published
move counts for the standard position and several Chess960 positions, castling edge
cases, move notation, the game logic (clocks, draws, rematches, connection tracking), the
position analyzer, lesson building and grading, accounts and streaks, the Stockfish
wrapper, and the Chess.com import.

```bash
cd backend
mvn test
```

This needs JDK 21 or newer, Maven, and the `stockfish` program on your `PATH`
(`brew install stockfish` on macOS). Without Stockfish only `StockfishEngineTest` fails;
everything else still runs. No database is needed.

**Frontend**: type checking and a production build, linting, and a small test suite
covering the Learn tab's quiz, moving through the move list (including the arrow keys),
and the captured-pieces and check-highlight helpers.

```bash
cd frontend
npm install
npm run build
npm run lint
npm test
```

## Working on the code without Docker

For fast reloading while editing, run the pieces separately:

```bash
docker compose up postgres                  # just the database
cd backend && mvn spring-boot:run           # backend on http://localhost:8080
cd frontend && npm install && npm run dev   # frontend on http://localhost:5173
```

Run each in its own terminal, then open http://localhost:5173. The frontend dev server
forwards `/api` and `/ws` to the backend. The backend needs `stockfish` on your `PATH` for
analysis and lessons.

## More documentation

- [docs/DECISIONS.md](docs/DECISIONS.md): the main design decisions and trade-offs, bugs
  that testing caught, how AI was used, and what I'd do next.
- [docs/DEPLOY.md](docs/DEPLOY.md): how the live site is hosted (Vercel, Render, Supabase)
  and how to set it up again.
- [k8s/README.md](k8s/README.md): running the app on Kubernetes.
- [docs/TIME_LOG.md](docs/TIME_LOG.md): the step-by-step log of the first build.
- [docs/transcripts/](docs/transcripts/chess960-build-session.md): a readable transcript
  of the whole chat with the AI coding agent that built the app.

## Credits

- Chess pieces: the ["Cburnett"](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
  set by Colin M. L. Burnett, licensed
  [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.en), used unmodified
  (taken from [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett)).
  The files are in `frontend/public/pieces/cburnett/`.
- Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces) for headings and
  [Manrope](https://fonts.google.com/specimen/Manrope) for text, from Google Fonts, both
  under the SIL Open Font License.
- Everything else, including the board, is original to this project.
