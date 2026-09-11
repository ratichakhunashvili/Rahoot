import type { LeaderboardEntry } from "@/lib/scoring";

// Shared types + broadcast-channel contract for LIVE-mode gameplay. Realtime
// sync is Supabase Realtime broadcast (see realtime-server.ts / realtime-client.ts)
// instead of a custom Socket.IO server - see src/lib/live-game.ts for the
// Server Actions that mutate state and fan changes out over this channel.

export function liveChannelName(homeworkId: string) {
  return `hw:${homeworkId}`;
}

export type LivePlayer = {
  studentId: string;
  firstName: string;
  lastName: string;
};

export type ClientOption = {
  id: string;
  text: string;
};

export type ClientQuestion = {
  questionId: string;
  index: number;
  total: number;
  type: "MULTIPLE_CHOICE" | "PARAGRAPH";
  text: string;
  points: number;
  timeLimitSec: number;
  options: ClientOption[]; // empty for PARAGRAPH
  startedAt: number; // ms epoch, client computes its own countdown from this
};

export type RevealPayload = {
  questionId: string;
  type: "MULTIPLE_CHOICE" | "PARAGRAPH";
  correctOptionId: string | null;
  optionCounts: Record<string, number>; // optionId -> number of students who picked it
  paragraphSubmitted: number;
  leaderboard: LeaderboardEntry[];
};

export type YourResultPayload = {
  questionId: string;
  isCorrect: boolean | null; // null = paragraph, pending manual grading
  pointsAwarded: number;
};

export type FinishedPayload = {
  leaderboard: LeaderboardEntry[];
};

/** Event -> payload map broadcast on the `hw:{homeworkId}` Realtime channel. */
export type LiveBroadcastMap = {
  "lobby:update": { students: LivePlayer[] };
  "phase:question": ClientQuestion;
  "phase:reveal": RevealPayload;
  "phase:finished": FinishedPayload;
  "phase:lobby": Record<string, never>; // host restarted the game - everyone resets back to the lobby
  "answer:count": { answered: number; total: number };
};

/**
 * Authoritative live-game state, computed fresh from Postgres (see
 * getLiveState in live-game.ts). Used both for the initial server-rendered
 * paint and to resync a client after a Realtime reconnect, since broadcast
 * messages don't replay anything missed while disconnected.
 *
 * `yourAnswer` is only populated when the caller passed a studentId (i.e.
 * for a student's own view) - it's this student's existing answer for the
 * current question, if any, so a page reload mid-question or mid-reveal
 * still shows "locked in" / their result instead of resetting it.
 */
export type LiveState =
  | { phase: "LOBBY"; players: LivePlayer[] }
  | {
      phase: "QUESTION";
      players: LivePlayer[];
      question: ClientQuestion;
      yourAnswer: YourResultPayload | null;
    }
  | {
      phase: "REVEAL";
      players: LivePlayer[];
      reveal: RevealPayload;
      yourAnswer: YourResultPayload | null;
    }
  | { phase: "FINISHED"; players: LivePlayer[]; finished: FinishedPayload };
