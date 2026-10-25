export interface ChessComStats {
  username: string;
  monthsScanned: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  gamesByTimeClass: Record<string, number>;
}
