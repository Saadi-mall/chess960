# Decisions, trade-offs, time, and what's next

## AI usage

This app was built with [Claude Code](https://claude.com/claude-code) (Claude Sonnet 5),
an AI coding agent, working interactively under my direction: I set the brief (the
`CLAUDE.md` in this repo is the actual spec I gave it, written before any code existed),
reviewed its design choices as it went, and it wrote essentially all of the code, tests,
infrastructure, and this document. The full session transcript is included with this
submission per the task's request to share agent transcripts.

Because of that, the time log below is agent wall-clock time, not focused human
engineering hours, and the two aren't comparable - the agent reads a published perft table
or drafts a Kubernetes manifest much faster than I would, but it also needed oversight the
whole way. I'm including it anyway because it's honest about how this was actually built,
and because the *order* and *content* of the work - what got tested, what bugs got caught
and how, what got cut - is the part that's actually representative of how I'd run a project
like this, agent or not.

## Time breakdown

Real timestamps from the build session, 2026-10-24, 21:39-23:15 (1h 36m total). Full
detail, including exactly what was tested at each step and every bug found along the way,
is in [TIME_LOG.md](TIME_LOG.md); summarized here:

| Step | Time | What |
|---|---|---|
| 1. Scaffold | 9 min | Repo, Docker Compose, Postgres, health check end-to-end |
| 2. Rules engine | 12 min | Board/moves/FEN, Chess960 castling, perft-tested |
| 3. Board UI | 7 min | Custom SVG board, click/drag, animation |
| 4. Play tab | 26 min | Multiplayer over WebSockets - the largest single piece |
| 5. Position analyzer | 5 min | Overview card facts |
| 6. Stockfish | 8 min | UCI engine, Postgres cache |
| 7. Analyze tab | 8 min | Sandbox play + live evaluation |
| 8. Learn tab | 6 min | Daily lesson, streak |
| 9. Chess.com import | 6 min | Optional - kept, since there was time |
| 10. Kubernetes | 6 min | Verified against a real local cluster |
| 11. README + this doc | 3 min | Final write-up, re-verified the one-command claim from a clean state |

## Main decisions

**No chess library - the rules engine is hand-written.** This was an explicit requirement
(see `CLAUDE.md`), not a default: the point was to show the engine itself, not plumbing
around someone else's. It's a plain 8x8 mailbox board (`index = rank * 8 + file`), chosen
over 0x88 or bitboards specifically because it's the version easiest to explain in an
interview - the performance difference doesn't matter at this scale.

**Castling is the king capturing its own rook.** This is the standard Chess960-friendly
encoding (it's literally how Stockfish represents it internally in `UCI_Chess960` mode,
which is a large part of why it was chosen): `Move.from` is the king's square, `Move.to` is
that rook's square, however close together or far apart they start. It sidesteps the
ambiguity a king-destination-square encoding has in Chess960, where sometimes the king
doesn't move (or the destination is also a legal king move for some other reason), and the
`UCI_Chess960` castling notation and this app's own notation end up identical - no
translation layer needed when a move crosses that boundary.

**Castling rights are Shredder-FEN (rook files), not `KQkq`.** `KQkq` can be genuinely
ambiguous in Chess960 (two rooks on the same side of the king), so rights are stored and
serialized as the rook's file letter. The parser still accepts classic `KQkq` for FENs
pasted in from elsewhere, resolved against the king's actual file on the board being
parsed.

**The frontend never computes chess rules - not even "which moves are legal from here".**
Every board view (Play, Analyze, Learn) gets its legal moves from the server and only ever
offers the server's own list back as a move; it has no code path that decides a move is
legal. The one exception that proves the rule: reading which piece sits on which square off
a FEN string, which is just parsing a server response, not ruling on anything. This is also
why the Analyze tab's sandbox has its own stateless `PositionService` on the backend (see
below) rather than letting the frontend track "the current position" by applying moves
itself.

**Game state is in-memory, not persisted to Postgres.** A live game (position, clocks,
tokens, draw-offer state) lives in a `ConcurrentHashMap` in the backend process. This was
deliberate, not an oversight: Postgres is used for the one thing that actually benefits
from persistence and is naturally keyed and bounded - the 960 starting-position Stockfish
evaluations, which are expensive to compute and reused constantly. A live game's state
changes every move and is only read by the (at most two) people playing it; persisting that
would mean either writing to Postgres on every move (latency, for no real benefit - nobody
needs a game to survive a backend restart in this scope) or a more complex write-behind
scheme, neither of which pays for itself here. The real cost of this choice is that the
backend can't horizontally scale past one replica without first moving this state
somewhere shared (see "what's next", and the comment in `k8s/backend-deployment.yaml`,
which deliberately deploys a single replica and explains why).

**Stockfish runs as a fresh process per evaluation, not a pool of long-lived engines.**
Simpler, with no shared-process concurrency to reason about, at the cost of ~50-100ms of
process startup per call. This is the right trade for a position-at-a-time analysis tool;
it would need revisiting for something evaluating many positions per second.

**Only the 960 starting positions are cached; positions reached by playing moves are
not.** There are exactly 960 of the former and they're requested repeatedly (every Analyze
or Learn tab load of a given number); there are effectively unbounded many of the latter,
so caching them wouldn't pay for itself and would need an eviction policy to avoid
unbounded growth.

**The Analyze sandbox doesn't detect threefold repetition.** Checkmate, stalemate,
insufficient material, and the 50-move rule are all checkable from a single FEN; threefold
repetition needs the position history, which a stateless "here's a FEN, give me the result
of one move" endpoint doesn't have (unlike a live `Game`, which does track it). Noted
explicitly in `PositionService`'s Javadoc rather than left as a silent gap.

**Insufficient material is simplified.** Both the live game and the Analyze sandbox treat a
lone king or king-plus-one-minor as insufficient and everything else (including two
knights, which technically still can't force mate) as sufficient - the same simplification
most chess software makes, rather than encoding the full theory of drawn material
combinations (e.g. opposite-colored bishops only, which this does *not* special-case).

**Timeout correctly checks the FIDE rule, not just raw material.** If a flag falls, the
game only credits the opponent with a win if *they* have enough material to actually force
checkmate - if neither side does, it's a draw, per FIDE 6.9. This is a real nuance a naive
"whoever didn't flag wins" implementation gets wrong.

**Pieces are the "Cburnett" SVG set, not Unicode glyphs.** The first pass rendered pieces
as colored, outlined SVG `<text>` using the Unicode chess characters, specifically to keep
the board self-contained with no external asset or licensing question to explain. After
seeing it rendered, that read as noticeably rougher than the rest of the UI, so it was
replaced with ["Cburnett"](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) -
Colin M. L. Burnett's widely-used CC BY-SA 3.0 set (the same one lichess ships by default) -
used unmodified, with the license and source cited in the README as that license requires.
The board itself is still custom SVG; only the piece artwork is external.

**Dark is the default theme, controlled by an explicit toggle, not `prefers-color-scheme`.**
The first color pass used `prefers-color-scheme` to pick light or dark, which meant the
actual default depended on each visitor's OS setting. Asked for dark specifically as the
default regardless of OS preference, with light still available, the fix was a `data-theme`
attribute set before first paint (reading a remembered choice from local storage, defaulting
to dark) rather than a media query - see `theme.ts`.

**The daily position is deterministic, not stored.** `Learn`'s "today's position" is
`new Random(date.toEpochDay()).nextInt(960)` - same date always gives the same number,
everywhere, with nothing to persist or coordinate. The Learn tab's streak is tracked
entirely in the browser's local storage; an anonymous learner id is also generated and
stored but genuinely unused today - it's there so a future server-side streak (one that
survives a cleared browser, or a leaderboard) could be added without inventing an identity
scheme later, not a half-finished feature.

**Chess.com import is a separate page, not a fourth tab.** It's the one explicitly
optional, cuttable item in the brief; linking it from the Analyze tab's setup screen keeps
the "three tabs" framing intact for everything else. It downloads a player's monthly
archives concurrently (Java 21 virtual threads) rather than sequentially, and tolerates one
failed month without failing the whole import, since Chess.com's API has no way to ask for
"just the Chess960 games" - importing means downloading everything and filtering
client-side, which gets slow sequentially for an active player.

**Daily lessons are built on the server from Stockfish's top lines.** Each day's lesson is computed once by `LessonBuilder` and cached in memory (rebuilt after a
restart, warmed up at startup so the first visitor doesn't wait): two MultiPV-3 searches,
one from the start and one after White's best move. Everything the lesson says is a fixed
template filled with numbers read off the board or moves Stockfish chose - no hand-written
chess advice, per the spec's "never made-up chess claims":

- **Key features**: castling routes and how many own pieces block them, what a bishop on a
  long diagonal will look at once its pawn moves, which pawns start undefended. Starting
  positions are mirror-symmetric, so features are described from White's side once.
- **Weakest pawn** rather than weakest square, since back-rank pieces counted as "weak
  squares" made the old question misleading. Fewest defenders wins; ties are broken by how
  many enemy bishops/queens are already aimed at the pawn down a diagonal (through only
  their own pawns); any pawn still tied is accepted.
- **Three best moves, any order**, for White and then for Black after White's best move.
  The lesson sends every legal move's SAN so the page can name a guess without knowing the
  rules; guesses are compared in the board's move encoding.
- **Plans** come last, because they'd give away the best-move answers: each side's moves
  from Stockfish's main line, drawn as arrows, with the line itself replayable in the
  notation column.

**Accounts: email and password, sessions in an HttpOnly cookie.** Chess.com OAuth is only issued to developers Chess.com approves, so it wasn't something
that could be built and tested here; plain email/password was chosen over third-party
OAuth. Passwords are BCrypt-hashed (`spring-security-crypto` only - no Spring Security
filter chain, since there are three protected endpoints). A session is a random 256-bit
token in an HttpOnly, SameSite=Lax cookie; the database stores only its SHA-256, so a
leaked table can't be used to sign in. SameSite=Lax plus JSON-only POST endpoints is the
CSRF protection. Wrong password and unknown email get the same response, and an unknown
email still runs a BCrypt comparison so the timing matches.

Signed-in learners send their **answers**, not their score: the server grades them against
its own copy of today's lesson, keeps only the first result per day, and only accepts
today's lesson, so a streak can't be faked or backfilled from the browser. Streaks are
computed from the stored dates (`Streaks`); a streak ending yesterday still counts until
today's lesson is missed. Guests keep the old per-browser streak.

**Email confirmation is built in but only on when email can be sent.** With an email
service configured, signing up stores a *pending* sign-up (password already
BCrypt-hashed) and emails a one-time link; the `users` row is only created when that link
is opened, so an address nobody controls never becomes an account. Like sessions, only the
SHA-256 of the link's token is stored; links expire after 24 hours, and repeat sign-ups
within a minute don't send another email (so the form can't be used to flood someone's
inbox). Email goes out through Brevo's HTTP API rather than SMTP, since free hosts often
block outgoing mail ports. Local development logs the link instead of sending it. The live
site has no email service (setting one up meant a sender domain and another account), so
there sign-up creates the account immediately - the trade-off is that an account's email
isn't proven to belong to its owner, which only matters once there's something like
password reset to send to it.

**Finished games can be analyzed.** The game state now carries each move in from/to form
as well as SAN. "Analyze this game" opens `/analyze?position=<n>&moves=e2e4,e7e5,...` -
a link that survives a refresh and can be shared - and Analyze replays it with one
`/api/positions/replay` request, then asks Stockfish only about the positions actually
looked at, so a long game doesn't trigger dozens of searches up front.

**The analysis board doesn't wait for Stockfish.** A move in Analyze makes two requests: the rules-only `/api/positions/move` (~30ms) whose
position goes on the board immediately, then `/api/analysis/evaluate` in the background,
whose result is filled in when it arrives (and dropped if that move was undone meanwhile).

**Check and captured pieces come from server data, not frontend rules.** The board
highlights the checked king when the server's SAN for the last move ends in `+` or `#`;
the frontend never works out check itself. Captured pieces and the material lead (+N) are
counted from the FEN: whatever is missing from each side's starting army (identical in
every Chess960 position) was captured, and the lead is the point difference of what's on
the board. That's reading data, like drawing the pieces, not rules. One known
approximation: after a promotion, the promoted pawn shows as "captured", though the +N
stays exact.

**Look: minimal, two accents.** The panels sit on the page without outlines, shadows or
divider lines; space separates things instead. Green stays the main accent (buttons, the
active tab, the board) and amber is the second, kept for "now": the running clock, the
current move in the list, and section labels. Headings are Fraunces (a serif, per the
brief), text is Manrope.

## Bugs perft (and other testing) actually caught

Called out here because they're the clearest evidence the testing was real, not
decorative:

- **A castling-rights bug perft caught, not inspection.** Capturing any piece on a
  castling rook's file - not just that rook, at any rank - was wrongly clearing the
  castling right. Two Chess960 perft positions were off by a handful of nodes at depth 4-5;
  tracing why led straight to the bug. Fixed by comparing the full square instead of just
  the file.
- **Dark-mode pieces were indistinguishable.** Piece fill colors reused the same light/dark
  UI theme tokens as the rest of the app, so in dark mode white and black pieces rendered
  identically. Caught by actually looking at a dark-mode screenshot, not by reasoning about
  the code.
- **Clicking a capture didn't work.** Clicking an occupied destination square hit that
  piece's own click handler (treated as "select this piece") instead of completing the
  pending move - would have broken every capturing move by click. Found while manually
  testing the board, before it ever touched a real game.
- **Two real WebSocket concurrency bugs**, found by writing a small scripted client and
  actually running three concurrent connections against the backend rather than trusting
  the code: a null value crashing Tomcat's session-attributes map for spectator
  connections, and concurrent broadcasts racing on the same WebSocket connection (Tomcat's
  remote endpoint isn't safe for concurrent writes from different threads).
- **A rematch handoff bug** that only showed up because two browser tabs of one profile
  share local storage, which incidentally exposed a second, real bug underneath: the
  rematch handoff left stale color/token in React state, because React Router doesn't
  remount a component on a param-only navigation (`/play/oldId` to `/play/newId`).
- **A board that stayed permanently scrambled after the first move**, found while testing
  drag-and-drop on a freshly redesigned layout. The back-rank "shuffle into place" entry
  animation set random offsets, then relied on a cancellable `requestAnimationFrame` chain
  to clear them - fragile under React StrictMode's mount-effect double-invoke: the first
  invocation's cleanup cancelled that rAF before it ever fired, and the second invocation's
  own guard (seeing it had "already handled" this fen) skipped rescheduling it entirely, so
  the offsets never got cleared. Confirmed by reading the actual DOM transform values rather
  than guessing from a screenshot - every back-rank piece had a random fractional
  `translate()`, every pawn a clean integer one. Fixed by moving the "is this a new fen"
  check to run during render (React's documented pattern for resetting derived state) so a
  second StrictMode invocation just redoes the same harmless work instead of being able to
  suppress the first invocation's cleanup step.
- **A join request that silently fired twice**, found immediately after fixing the bug
  above while re-testing with two browser tabs: the second tab got "Game already has two
  players" even though it was the first thing to try joining. The join effect's
  `cancelled` flag (the same React-recommended pattern used everywhere else in this app)
  only discards a stale *result* - it doesn't stop the `POST /join` request, which has a
  real server-side side effect, from actually firing. Under StrictMode's double-invoke, the
  first invocation's request quietly succeeded and claimed the seat, then had its result
  thrown away by its own cleanup; the second invocation's request then failed because the
  seat it wanted was already taken. Fixed with a ref-guarded "only ever fire this request
  once per component instance" check instead of a cancel-the-result pattern, since this
  request isn't safe to fire twice regardless of which result gets kept.
- **A board that rendered absurdly small**, caught the moment the redesigned layout was
  first opened in-browser: a flex child sized with `width: 100%` but no `flex-basis`
  collapsed instead of filling its row. Fixed with CSS container queries
  (`container-type: size` on the board's flex cell, `100cqmin` on the board itself) instead
  of fighting the flex sizing further.
- **An invalid CSS value that silently did nothing.** `justify-content: stretch` was used
  to stop the board page from being vertically centered on mobile - that's a valid Grid
  value but not a real Flexbox one, so the browser dropped the whole declaration and the
  centering rule it was meant to override stayed active, leaving a dead gap above the
  board. Replaced with `margin: auto` on the centered pages instead, which doesn't depend
  on overriding another rule at all.
- **A Kubernetes crash-loop**, found by actually standing up a local `kind` cluster rather
  than trusting the YAML: the backend fails fast (and crash-loops) if Postgres isn't
  reachable yet at startup. Fixed with an init container, confirmed with a clean
  zero-restart redeploy.
- **The Learn tab's quiz clicks never highlighted anything.** `Chessboard`'s "pick a
  square" mode (`onSquareClick`) reported the click straight to the parent without ever
  calling its own `setSelected`, so nothing on the board reacted - and because grading ran
  immediately on click, there was no way to change your answer either. Fixed by (1) having
  the board highlight the clicked square itself in that mode, and (2) splitting "pick" from
  "grade" in `LearnTab`: a click (for the weakest-square quiz) or a completed move (for the
  two best-move steps) now only stages an answer - a new `markers` prop on `Chessboard`
  shows it, and lets the parent later recolor the same squares green/red - and nothing is
  graded, or sent to the server for the move steps, until Submit. Covered by
  `LearnTab.test.tsx`, the project's first frontend test.
- **Move lists showed raw coordinates like "e3g1".** The move history was the engine's
  from/to encoding, which for Chess960 castling is "king takes own rook" - unreadable, and
  not valid notation. Added `San` to the rules package (disambiguation by file/rank among
  *legal* alternatives only, `exd5`-style pawn captures, `=Q` promotions, `+`/`#`, and
  `O-O`/`O-O-O` decided by which side the rook is on). It's on the server because SAN
  depends on the position - captures, ambiguity, check - and the frontend doesn't compute
  rules. Covered by `SanTest`, including Chess960 castling where the rook starts next to
  the king.
- **The second player couldn't join from the same browser.** Seats were kept in
  `localStorage`, which every tab shares, so opening the invite link in a second tab found
  the first tab's White seat and became a second White: the game never started and none of
  Black's controls appeared. Seats are now in `sessionStorage` (per tab, still survives a
  refresh). Trade-off: closing the tab and reopening the link no longer rejoins as that
  player.
- **A "Random" game didn't start on the previewed position.** The create request asked the
  server to roll a new random number instead of sending the one already on screen. It now
  sends the previewed number.
- **Capture and castling targets had no move hint.** Legal-move dots were drawn under the
  pieces, so any destination with a piece on it (a capture, or the own rook for castling)
  was hidden. Hints are now drawn above the pieces, as a ring on occupied squares.

- **"Not connected" next to a player who was clearly playing.** After a rematch, a new game
  or a refresh, the page opens its new connection before the old one's close reaches the
  server, and the late close marked that player as disconnected. The server now only marks
  a player gone when none of their connections is still open (with a test that replays
  that exact order). The page is also rebuilt from scratch for each game id, so nothing
  from the previous game's page carries over.
- **The analysis board lagged behind every move.** Each move went to an endpoint that ran
  Stockfish's 800ms search before answering, so the piece only moved about a second after
  it was played. Split into a fast rules request and a background evaluation (see above).

## What I'd do next with more time

- **Shared game state**, so the backend can run more than one replica. Most likely Redis:
  game state moves there, the WebSocket handler and REST layer become stateless, and any
  backend pod can serve any game. This is the main thing standing between this app and
  being horizontally scalable.
- **Persist finished games.** Right now a completed game's move history disappears when
  the backend restarts. A `games` / `moves` table, written once at game end (not every
  move - no need for that write volume), would let a "my games" or "review a past game"
  feature exist.
- **Branching lines in Analyze.** You can now step back through the moves played (and Undo
  the last one), but playing a different move from an earlier position isn't supported -
  moves only go on the end of the line. A small tree of variations would fix that.
- **Multi-PV in Analyze.** `StockfishEngine.topLines` already powers the lessons; the
  Analyze tab could show the top three lines too instead of just the best move.
- **Games played from a position.** There's no public database to search Chess960 games by
  starting position. The plan: store finished games here (see "Persist finished games"),
  list the ones from today's lesson position, and match a signed-in user's own Chess.com
  960 games by their `SetUp`/`FEN` PGN headers.
- **Account hardening**: rate-limit log-in attempts, password reset,
  and moving a guest's browser streak into their account when they sign up. Chess.com
  OAuth as a second way to sign in, once approved credentials exist.
- **A real opponent-strength option for Learn/Analyze** - right now Stockfish always plays
  at full strength; `UCI_LimitStrength` / `UCI_Elo` would let the Learn tab's quizzes scale
  to a beginner.
- **More frontend automated tests.** There's now a small Vitest + React Testing Library
  suite (`LearnTab.test.tsx`, `useHistoryNav.test.ts`), added once the Learn tab had an
  interaction bug worth regression-testing, but most of the UI is still only verified manually in-browser.
  Given more time: component tests for the board's own move/drag/promotion logic (the
  highest-value remaining target, since it's the piece every tab depends on) and a couple
  of Playwright end-to-end flows (create a game, join it, play a few moves).
- **CI** (GitHub Actions): backend `mvn test` and frontend `tsc && vite build && oxlint` on
  every push, since right now all of that only ran locally, by hand, once per step.
- **HTTPS/WSS and real secret management** for any deployment that isn't local - the
  Kubernetes manifests commit demo credentials in plaintext-base64 and the app assumes
  plain `ws://`, both fine for this scope and neither fine for production (see
  `k8s/README.md` for the full list of what's deliberately left out there).
- **Opposite-colored-bishop endgames** in the insufficient-material check, and threefold
  repetition in the Analyze sandbox (would need the client to send along its own position
  history, since the endpoint is intentionally stateless).
