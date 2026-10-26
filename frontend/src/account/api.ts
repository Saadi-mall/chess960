export interface User {
  email: string;
  displayName: string;
}

export interface Guess {
  from: string;
  to: string;
  promotion: string | null;
}

/** What the learner answered - the server grades it against its own copy of the lesson. */
export interface LessonAnswers {
  weakestPawn: string | null;
  whiteGuesses: Guess[];
  blackGuesses: Guess[];
}

export interface ResultSummary {
  date: string;
  number: number;
  weakestPawnCorrect: boolean;
  whiteFound: number;
  blackFound: number;
}

export interface Progress {
  currentStreak: number;
  longestStreak: number;
  lessonsCompleted: number;
  weakestPawnsFound: number;
  bestMovesFound: number;
  today: ResultSummary | null;
  recent: ResultSummary[];
}

async function asJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

function post(url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function fetchMe(): Promise<User | null> {
  return fetch("/api/auth/me").then(asJson<{ user: User | null }>).then((r) => r.user);
}

export function register(email: string, password: string, displayName: string): Promise<User> {
  return post("/api/auth/register", { email, password, displayName })
    .then(asJson<{ user: User }>)
    .then((r) => r.user);
}

export function login(email: string, password: string): Promise<User> {
  return post("/api/auth/login", { email, password })
    .then(asJson<{ user: User }>)
    .then((r) => r.user);
}

export async function logout(): Promise<void> {
  await post("/api/auth/logout");
}

export function submitLessonAnswers(answers: LessonAnswers): Promise<Progress> {
  return post("/api/lessons/today/result", answers).then(asJson<Progress>);
}

export function fetchProgress(): Promise<Progress> {
  return fetch("/api/me/progress").then(asJson<Progress>);
}
