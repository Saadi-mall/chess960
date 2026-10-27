# Decisions, trade-offs, and what's next

This document explains why the app is built the way it is: the main design decisions and
what each one costs, the bugs that testing caught, and what I'd do with more time. For how
to run the app, see the [README](../README.md).

Contents:

1. [How this was built](#how-this-was-built)
2. [Rules engine](#rules-engine)
3. [Server and data](#server-and-data)
4. [Stockfish](#stockfish)
5. [Frontend](#frontend)
6. [Daily lesson](#daily-lesson)
7. [Accounts](#accounts)
8. [Hosting](#hosting)
9. [Bugs that testing caught](#bugs-that-testing-caught)
10. [What I'd do next](#what-id-do-next)

## How this was built

### AI usage

The app was built with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding
agent, working under my direction. I wrote the brief (`CLAUDE.md` in this repo is the spec
I gave it, written before any code existed), reviewed its design choices as it went, tested
the app myself, asked for changes, and fixed bugs in the code. The agent wrote most of the main codebase, tests,
infrastructure and documentation. A readable transcript of the whole session is in
[transcripts/chess960-build-session.md](transcripts/chess960-build-session.md), as
required.

### Time

The first complete version was built in one session on 2026-10-24, from 21:39 to 23:15
(1 hour 36 minutes), following the build order in `CLAUDE.md`. These are the agent's
wall-clock times, not focused human hours, so they aren't comparable to a person coding
alone. The step-by-step log, with what was tested at each step, is in
[TIME_LOG.md](TIME_LOG.md).

| Step | Time | What |
|---|---|---|
| 1. Scaffold | 9 min | Repo, Docker Compose, Postgres, health check end-to-end |
| 2. Rules engine | 12 min | Board, moves, FEN, Chess960 castling, perft tests |
| 3. Board UI | 7 min | Custom SVG board, click and drag, entry animation |
| 4. Play tab | 26 min | Multiplayer over WebSockets (the largest single piece) |
| 5. Position analyzer | 5 min | Overview card facts |
| 6. Stockfish | 8 min | UCI engine wrapper, Postgres cache |
| 7. Analyze tab | 8 min | Play out moves with a live evaluation |
| 8. Learn tab | 6 min | Daily lesson, streak |
| 9. Chess.com import | 6 min | Optional; kept, since there was time |
| 10. Kubernetes | 6 min | Tested on a real local cluster |
| 11. README and this doc | 3 min | Write-up; re-tested the one-command setup from scratch |

After that first version, I used the app and asked for several rounds of changes, which
weren't timed:

- A redesigned layout: a large board with player bars, and a move list with back/forward
  buttons and arrow keys.
- Proper move notation, confirmation dialogs, and legal-move hints.
- A richer daily lesson.
- Optional accounts with server-side streaks.
- Deployment to Vercel, Render and Supabase.
- Analyzing a finished game, plus a last-move highlight, check highlight and captured
  pieces.
- A visual refresh.

The bugs found along the way are listed [below](#bugs-that-testing-caught).

## Rules engine

**No chess library: the rules engine is hand-written.** This was a requirement of the brief.
The point was to show the engine itself. The board is a plain 8x8 array
(`index = rank * 8 + file`), chosen over 0x88 or bitboards because it's the easiest to read
and explain. The speed difference doesn't matter at this scale.

**Castling is the king capturing its own rook.** A castling move is stored as
`from` = the king's square, `to` = that rook's square, wherever they start. In Chess960 the
king's destination square alone can be ambiguous: sometimes the king doesn't move at all,
or its destination is also an ordinary king move. "King takes own rook" never is. It's also
exactly how Stockfish writes castling in its Chess960 mode, so moves pass between the app
and Stockfish with no translation.

**Castling rights use Shredder-FEN (rook files), not `KQkq`.** `KQkq` can be ambiguous in
Chess960 (for example, two rooks on the same side of the king), so rights are stored as
each rook's file letter, like `HAha`. The FEN parser still accepts `KQkq` from elsewhere and
works out which rooks it means from where the king is.

**Correctness is tested with perft, against published numbers.** Perft counts every
possible move sequence to a given depth. The counts are compared with published results:
the standard starting position and a set of Chess960 positions from the Chess Programming
Wiki. A single wrong move anywhere changes the totals. Perft caught a real castling bug
(see [below](#bugs-that-testing-caught)).

**Insufficient material is simplified.** Each side is checked on its own: a lone king, or a
king with a single bishop or knight, can't mate; anything more counts as enough, even two
knights (which can't force mate). The game is drawn when neither side has enough. Most
chess software simplifies the same way instead of encoding every dead position.

**A timeout follows the FIDE rule.** When a player's clock runs out, the opponent only
wins if they still have enough material to checkmate. Otherwise it's a draw (FIDE article
6.9). A simple "whoever ran out of time loses" gets this wrong.

## Server and data

**The frontend never computes chess rules, not even which moves are legal.** Every board
(Play, Analyze, Learn) gets its legal moves from the server and can only send one of those
back. Even move notation (`Nf3`, `O-O`, `+`) comes from the server, because it depends on
the position. The frontend only reads data off what the server sends:

- **Where the pieces are**: read from the FEN to draw them.
- **Check**: the king is highlighted when the server's notation for the last move ends in
  `+` or `#`.
- **Captured pieces and the +N lead**: each side's starting army is the same in every
  Chess960 position (8 pawns, 2 rooks, 2 knights, 2 bishops, a queen), so whatever is
  missing from the FEN was captured. The lead is the point difference of what's on the
  board. One known approximation: after a promotion, the promoted pawn shows as
  "captured", though the +N is still exact.

**Live games are kept in memory, not in Postgres.** A game's position, clocks, seat tokens
and draw offers live in a map in the backend process. Postgres is used for what actually
needs to last:

- accounts and login sessions;
- lesson results;
- the Stockfish evaluations of the 960 starting positions, which are slow to compute and
  requested constantly.

A live game changes on every move and is read only by its two players and any spectators.
Writing it to the database on every move would add delay for no real benefit at this
scope.

The costs:

- Games are lost when the backend restarts, which on the free host also happens when it
  goes to sleep.
- The backend can only run as one copy, because a second copy wouldn't see the first
  one's games. `k8s/backend-deployment.yaml` deliberately runs a single replica and
  explains why.

**Seats are per browser tab.** Joining a game gives the browser a secret seat token, kept in
`sessionStorage`. That way a second tab in the same browser can join as the opponent, and a
refresh keeps your seat. Closing the tab and opening the link again later joins as a
spectator instead.

**The connected/disconnected dot counts open connections.** One player can briefly have two
connections, for example after a refresh, when the new page connects before the old one's
disconnect arrives. A player is only marked as gone when none of their connections is
still open.

**Analyze uses stateless endpoints.** Analyze isn't a stored game. The page sends the
current position (as FEN) and a move, and the server answers with the new position, its
legal moves and the game status. A finished game opens in Analyze through a link like
`/analyze?position=518&moves=e2e4,e7e5,...`, which the server replays in one request. The
cost of being stateless: Analyze doesn't detect threefold repetition, because that needs
the position history, which a single FEN doesn't have. Live games do detect it.

**A move in Analyze doesn't wait for Stockfish.** Each move makes two requests:

1. A fast rules request (about 30 ms), whose new position goes on the board immediately.
2. An evaluation request in the background, whose result appears when it's ready. It's
   dropped if that move was undone meanwhile.

**The daily position is computed from the date, not stored.** It's
`new Random(date.toEpochDay()).nextInt(960)`: the same date always gives the same
position, for everyone, with nothing to store or keep in sync.

**Chess.com stats are an extra tab at the end.** It's the one optional item in the brief,
so it sits after the three main tabs. Chess.com's API can't filter games by variant, so the
backend downloads a player's monthly archives in parallel (Java 21 virtual threads) and
keeps only the Chess960 games. One failed month doesn't fail the whole import.

## Stockfish

**Stockfish runs inside the backend container, in Chess960 mode.** It's installed in the
backend's Docker image and driven over UCI, its standard text protocol, with
`UCI_Chess960` switched on.

**A fresh Stockfish process for each evaluation, not a pool.** This is simpler, and there's
no shared engine state to manage between requests. The cost is about 50-100 ms of startup
per call. That's fine for analyzing one position at a time. It would need revisiting for
something that evaluates many positions per second.

**Only the 960 starting positions are cached.** There are exactly 960 of them, and they're
requested over and over. Positions reached by playing moves are effectively unlimited, so
caching those would need an eviction policy and wouldn't pay off.

## Frontend

**The board is custom SVG; the pieces are the "Cburnett" set.** The first version drew the
pieces with Unicode chess symbols, to avoid any external assets. Next to the rest of the UI
that looked rough, so the pieces were replaced with Colin M. L. Burnett's CC BY-SA 3.0
set, the one lichess uses by default. The license is credited in the README. The board,
coordinates, arrows and animations are all the project's own SVG.

**Minimal look with two accents.** There are no outlines, shadows or divider lines; spacing
separates things instead.

- **Green** is the main accent: buttons, the active tab, the board.
- **Amber** is the second accent, kept for "right now": the running clock, the current
  move in the list, and the small section labels.
- **Fonts**: headings use Fraunces (a serif, as the brief asked), and text uses Manrope.

**Dark mode is the default, with a toggle.** Picking light or dark from the operating
system's setting meant the default depended on each visitor's machine. I wanted dark by
default with light still available, so the page sets the theme before it first draws,
from a saved choice or dark (see `frontend/src/theme.ts`).

## Daily lesson

**Lessons are built on the server from Stockfish's top lines.** Each day's lesson is
computed once by `LessonBuilder` and cached in memory. It's rebuilt after a restart, and
built at startup so the first visitor doesn't wait. It takes two Stockfish searches, each
asking for the top three moves: one from the starting position, and one after White's best
move. Every sentence in the lesson is a fixed template filled with values read off the board
or moves Stockfish chose. Nothing is hand-written chess advice, as the brief required.

The lesson has five steps:

1. **Key features**: castling routes and how many of a side's own pieces block them, what
   a bishop on a long diagonal will see once its pawn moves, and which pawns start
   undefended. Starting positions are mirror images for the two sides, so features are
   described once, from White's side.
2. **Weakest pawn** (rather than the weakest square, because back-rank pieces made "weakest
   square" misleading): the pawn with the fewest defenders. Ties are broken by how many
   enemy bishops or queens already aim at it; any pawn still tied counts as correct.
3. **White's three best moves**, in any order.
4. **Black's three best replies** after White's best move, in any order. To show each guess
   in proper notation without knowing the rules, the page receives every legal move's
   notation with the lesson.
5. **Plans** come last, because they'd give away the answers: each side's moves from
   Stockfish's main line, drawn as arrows, with the line replayable in the move list.

## Accounts

**Email and password; the session is an HttpOnly cookie.** Chess.com sign-in (OAuth) is
only available to developers Chess.com approves, so it couldn't be built and tested here.

- **Passwords** are hashed with BCrypt, using only `spring-security-crypto`. There's no full
  Spring Security setup, since only three endpoints need a signed-in user.
- **Sessions**: a session is a random 256-bit token in an HttpOnly, SameSite=Lax cookie.
  The database stores only its SHA-256 hash, so a leaked table can't be used to sign in.
- **CSRF**: the SameSite=Lax cookie plus JSON-only POST endpoints protects against
  cross-site request forgery.
- **No account probing**: a wrong password and an unknown email get the same answer and
  take the same time, so the login form can't be used to find out who has an account.
- **On the live site**, the browser only ever talks to the Vercel address for `/api`
  (Vercel forwards it to Render), so the cookie is an ordinary first-party cookie.

**The server grades lesson answers.** A signed-in learner sends their answers, not a score.
The server grades them against its own copy of today's lesson, keeps only the first result
each day, and only accepts today's lesson, so a streak can't be faked or backdated. A streak
that ended yesterday still counts until today's lesson is missed. Guests keep their streak
in the browser (`localStorage`) instead.

**Email confirmation is built in but off unless email is configured.** With an email
service set up (Brevo), sign-up works like this:

- It stores a *pending* sign-up, with the password already hashed, and emails a one-time
  link. The account is only created when that link is opened.
- Links expire after 24 hours, and only their hash is stored.
- Signing up again within a minute doesn't send another email, so the form can't be used
  to flood someone's inbox.
- Email goes through Brevo's HTTP API rather than SMTP, because free hosts often block mail
  ports.

Without an email service, which is how both the live site and `docker compose up` run,
sign-up creates the account and signs in immediately. The trade-off is that an account's
email isn't proven to belong to its owner. That only starts to matter once something is
emailed to it, like a password reset. To try the confirmation flow locally, set
`LOG_EMAILS_WHEN_UNCONFIGURED=true`, and the link is written to the backend's log instead
of being emailed.

## Hosting

**Live: Vercel (frontend), Render (backend), Supabase (database), all on free plans.** The
backend needs a long-running server for WebSockets and Stockfish, which Vercel can't host,
so it runs as the same Docker image on Render. The database is on Supabase because
Render's free Postgres is deleted after 30 days. Setup steps are in [DEPLOY.md](DEPLOY.md).

The main cost is that **Render's free plan sleeps after 15 minutes without traffic**:

- The first request after a sleep takes about 30-60 seconds.
- In-memory games and the cached lesson are cleared by a sleep.
- An open game sends a small ping every 4 minutes, so a game in progress keeps the server
  awake.
- A paid plan, or an uptime monitor hitting the health check every 10 minutes, would
  remove the wait entirely.

**Docker Compose for running it locally; Kubernetes manifests as an example.** `docker
compose up --build` is the one-command setup. The manifests in `k8s/` show the same app on a
cluster (tested on a local `kind` cluster). The live site doesn't use them.

## Bugs that testing caught

Listed because they show where the testing actually paid off.

- **A castling-rights bug that perft caught.** Capturing *any* piece on a castling rook's
  file, at any rank, wrongly removed that castling right. Two Chess960 perft positions were
  off by a handful of moves at depth 4-5, and tracing why led straight to it. Fixed by
  comparing the full square, not just the file.
- **White and black pieces looked identical in dark mode.** The piece colors reused the
  page's theme colors, which swap in dark mode. Caught by looking at a dark-mode
  screenshot.
- **Clicking to capture didn't work.** Clicking a square with a piece on it selected that
  piece instead of finishing the move, which would have broken every capture made by
  clicking. Found while testing the board by hand.
- **Two WebSocket concurrency bugs**, found by running three scripted connections against
  the backend at once:
  - a spectator's empty seat value crashed Tomcat's session storage;
  - two messages sent to the same connection at the same moment collided, because Tomcat
    doesn't allow simultaneous writes to one connection.
- **The board stayed scrambled after the first move.** The "pieces shuffle into place"
  animation broke under React's development-mode double rendering: its cleanup step was
  skipped, so the back-rank pieces kept random offsets. Found by reading the actual
  `transform` values in the page, and fixed by deciding "is this a new position?" during
  rendering instead of in an effect.
- **Joining a game fired twice.** In development mode React runs effects twice. The join
  request has a real effect on the server (it claims a seat), so the first request took the
  seat and the second failed with "Game already has two players". Fixed by guarding the
  request so it can only be sent once per page.
- **The board rendered tiny.** A flexbox sizing issue in a redesigned layout. Fixed with CSS
  container queries, which size the board from the space actually available.
- **A CSS rule that silently did nothing.** `justify-content: stretch` isn't valid in
  flexbox, so the browser dropped it and left a gap above the board on phones. Replaced
  with `margin: auto`.
- **A Kubernetes crash loop.** On a real local cluster, the backend crashed repeatedly
  because it started before Postgres was ready. Fixed with an init container that waits for
  the database, then confirmed with a clean redeploy and zero restarts.
- **Learn's quiz didn't show your answer.** Clicking a square sent the answer straight away
  without highlighting it, and there was no way to change it. Fixed by separating "choose"
  from "submit". `LearnTab.test.tsx`, the project's first frontend test, covers it.
- **Moves showed as raw coordinates like "e3g1".** The move list showed the internal
  from/to format, which for castling is "king takes rook". Added proper notation (`San`) on
  the server, including Chess960 castling where the rook starts next to the king.
  `SanTest` covers it.
- **A second tab couldn't join as the opponent.** Seats were kept in `localStorage`, which
  all tabs share, so the second tab became a second White. Seats moved to `sessionStorage`
  (one per tab).
- **"Random" started a different position from the one shown.** The create request asked
  the server for a new random number instead of sending the one on screen.
- **No move hint on captures or castling.** The legal-move dots were drawn under the pieces,
  so they were hidden on occupied squares. They're now drawn on top, as a ring.
- **Analyze lagged a second behind every move**, because each move waited for Stockfish.
  Split into a fast rules request plus a background evaluation (see
  [Server and data](#server-and-data)).
- **"Not connected" next to a player who was clearly playing.** After a rematch, a new game
  or a refresh, the old connection's disconnect arrived after the new connection had
  opened, and marked the player as gone. Fixed on the server, with a test that replays that
  exact order. The game page is also rebuilt from scratch for each game.

## What I'd do next

- **Shared game state (most likely Redis)** so the backend can run several copies, and games
  survive a restart. This is the main thing stopping it from scaling out.
- **Save finished games** in Postgres (written once when a game ends), to allow "my games",
  reviewing past games, and listing games played from today's lesson position.
- **Branching lines in Analyze.** You can step back and undo, but playing a different move
  from an earlier position isn't supported yet.
- **Top three lines in Analyze.** The engine wrapper already supports it (the lessons use
  it).
- **Account features**:
  - password reset;
  - limiting repeated login attempts;
  - carrying a guest's streak over when they sign up;
  - turning on email confirmation on the live site.
- **Adjustable engine strength** (`UCI_LimitStrength` / `UCI_Elo`), so lessons could be
  pitched at beginners.
- **More frontend tests.** Most of the UI is tested by hand in the browser. The best next
  targets are component tests for the board's click, drag and promotion handling, and a few
  Playwright end-to-end tests (create a game, join it, play some moves).
- **Continuous integration** (GitHub Actions) running the backend and frontend checks on
  every push. Today they're run by hand.
- **Keep the live backend awake** with a paid plan or an uptime monitor, so the first visit
  is never slow.
- **Production-grade Kubernetes**: the example manifests keep demo database credentials in a
  committed Secret and serve plain HTTP. A real cluster would use a secret manager and TLS
  (see `k8s/README.md`).
- **Rule gaps**: rarer dead positions (for example a king and two bishops on the same
  color against a lone king), and threefold repetition in Analyze (the page would need to
  send its move history).
