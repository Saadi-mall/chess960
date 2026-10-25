export interface CreateGameResponse {
  gameId: string;
  color: "white" | "black";
  token: string;
  startingNumber: number;
}

export interface JoinResponse {
  color: "white" | "black";
  token: string;
}

export interface GameInfoResponse {
  gameId: string;
  whiteJoined: boolean;
  blackJoined: boolean;
  initialSeconds: number;
  incrementSeconds: number;
  status: string;
}

async function asJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

export function createGame(params: {
  positionMode: "RANDOM" | "NUMBER" | "DAILY";
  number?: number;
  initialSeconds: number;
  incrementSeconds: number;
}): Promise<CreateGameResponse> {
  return fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).then(asJson<CreateGameResponse>);
}

export function joinGame(gameId: string): Promise<JoinResponse> {
  return fetch(`/api/games/${gameId}/join`, { method: "POST" }).then(asJson<JoinResponse>);
}

export function getGameInfo(gameId: string): Promise<GameInfoResponse> {
  return fetch(`/api/games/${gameId}`).then(asJson<GameInfoResponse>);
}
