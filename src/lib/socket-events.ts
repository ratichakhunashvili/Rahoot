import type { LeaderboardEntry } from "@/lib/scoring";

// Shared Socket.IO event contracts between server.ts and the LIVE-mode client
// components. Kept in one file so client and server never drift apart.

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

/** Events the server emits (to the `hw:{homeworkId}` room, unless noted as "targeted"). */
export interface ServerToClientEvents {
  "lobby:update": (payload: { students: LivePlayer[] }) => void;
  "phase:question": (payload: ClientQuestion) => void;
  "phase:reveal": (payload: RevealPayload) => void;
  "phase:finished": (payload: FinishedPayload) => void;
  "phase:lobby": () => void; // host restarted the game - everyone resets back to the lobby
  "answer:you": (payload: YourResultPayload) => void; // targeted at one student's socket
  "answer:count": (payload: { answered: number; total: number }) => void;
  "error": (payload: { message: string }) => void;
}

/** Events clients emit to the server. */
export interface ClientToServerEvents {
  "lobby:join": (
    payload: { homeworkId: string; studentId: string; clientToken: string },
    ack: (ok: boolean, error?: string) => void
  ) => void;
  "host:join": (
    payload: { homeworkId: string },
    ack: (ok: boolean, error?: string) => void
  ) => void;
  "host:start": (payload: { homeworkId: string }) => void;
  "host:next": (payload: { homeworkId: string }) => void;
  "host:end": (payload: { homeworkId: string }) => void;
  // Wipes every submitted answer for this homework and resets the live
  // session back to the lobby - a true do-over, not just "go back a phase".
  "host:restart": (payload: { homeworkId: string }) => void;
  "student:answer": (payload: {
    homeworkId: string;
    questionId: string;
    selectedOptionId?: string;
    textAnswer?: string;
  }) => void;
}
