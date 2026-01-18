
export interface Player {
  id: string;
  name: string;
  number: number;
  isOnCourt: boolean;
  secondsPlayed: number;
  points: number; // New: Track points
  isFouledOut?: boolean;
  isInjured?: boolean; // New: Track injury status
  consecutiveSecondsOnCourt?: number; // New: Track current shift length
  consecutiveSecondsOnBench?: number; // New: Track time sat on bench
  lastSubOutTime?: number; // New: Timestamp (game clock) when player last left the court
  lastSubInTime?: number; // New: Timestamp (game clock) when player entered the court
}

export interface Team {
  name: string;
  players: Player[];
  color?: string; // Optional color hint for UI
}

export interface GameEvent {
  id: string;
  type: 'SUBSTITUTION' | 'START' | 'PAUSE' | 'PERIOD_END' | 'FOUL_OUT' | 'INJURY' | 'RECOVERY' | 'SCORE';
  description: string;
  timestamp: string; // Game clock time
  period: number;
  playerIn?: string;
  playerOut?: string;
}

export interface GameState {
  isRunning: boolean;
  period: number;
  gameClockSeconds: number; // Seconds remaining in period (counting down usually, or up)
}

export enum GameMode {
  FOUR_VS_FOUR = 4,
  FIVE_VS_FIVE = 5
}

export interface SavedGame {
  id: string;
  date: string; // ISO string
  name: string;
  gameMode: number;
  durationSeconds: number;
  players: Player[]; // Snapshot of stats
  events: GameEvent[];
  notes: string;
  scoreUs?: number; // Manual final score
  scoreThem?: number; // Manual final score
  aiMessage?: string; // Still useful if we save the prompt used
}