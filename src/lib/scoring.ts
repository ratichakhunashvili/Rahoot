import { prisma } from "@/lib/prisma";
import type { HomeworkMode } from "@/generated/prisma/client";

/**
 * Points awarded for a correct multiple-choice answer.
 * - ASYNC (self-paced homework): always the question's full point value - predictable homework grading.
 * - LIVE (hosted session): scaled by answer speed, Kahoot-style - faster correct answers score higher.
 */
export function computeMultipleChoicePoints(params: {
  isCorrect: boolean;
  basePoints: number;
  mode: HomeworkMode;
  elapsedMs: number;
  timeLimitSec: number;
}): number {
  const { isCorrect, basePoints, mode, elapsedMs, timeLimitSec } = params;
  if (!isCorrect) return 0;
  if (mode === "ASYNC") return basePoints;

  const timeLimitMs = Math.max(timeLimitSec, 1) * 1000;
  const remainingFraction = Math.min(
    1,
    Math.max(0, 1 - elapsedMs / timeLimitMs)
  );
  return Math.round(basePoints * (0.5 + 0.5 * remainingFraction));
}

export type LeaderboardEntry = {
  studentId: string;
  firstName: string;
  lastName: string;
  totalScore: number;
  answeredCount: number;
  pendingGrading: number;
  joinedAt: Date;
};

/** Ranked leaderboard for a homework, computed live from stored answers (no cached/stale totals). */
export async function getLeaderboard(
  homeworkId: string
): Promise<LeaderboardEntry[]> {
  const students = await prisma.student.findMany({
    where: { homeworkId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      joinedAt: true,
      answers: {
        select: { pointsAwarded: true, isCorrect: true },
      },
    },
  });

  const entries: LeaderboardEntry[] = students.map((s) => ({
    studentId: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    joinedAt: s.joinedAt,
    totalScore: s.answers.reduce((sum, a) => sum + a.pointsAwarded, 0),
    answeredCount: s.answers.length,
    pendingGrading: s.answers.filter((a) => a.isCorrect === null).length,
  }));

  entries.sort((a, b) => b.totalScore - a.totalScore);
  return entries;
}
