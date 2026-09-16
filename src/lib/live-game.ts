"use server";

import { prisma } from "@/lib/prisma";
import { canManageHomework } from "@/lib/homework-auth";
import { getStudentForHomework } from "@/lib/student-session";
import { computeMultipleChoicePoints, getLeaderboard } from "@/lib/scoring";
import { broadcast } from "@/lib/realtime-server";
import type {
  ClientQuestion,
  RevealPayload,
  FinishedPayload,
  LivePlayer,
  LiveState,
  YourResultPayload,
} from "@/lib/live-events";

// Everything a live game needs to know lives in Postgres (Homework.livePhase
// / currentQuestionIndex / questionStartedAt, plus the usual Question/Option/
// Answer/Student rows) - there's no in-memory game-state Map anymore, since a
// Vercel Function is stateless and gives no instance affinity across
// requests. Every action here re-derives state fresh and, where it changes
// something, broadcasts the change over Supabase Realtime (see
// realtime-server.ts) so every connected browser stays in sync.

async function fetchPlayers(homeworkId: string): Promise<LivePlayer[]> {
  const students = await prisma.student.findMany({
    where: { homeworkId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { joinedAt: "asc" },
  });
  return students.map((s) => ({ studentId: s.id, firstName: s.firstName, lastName: s.lastName }));
}

async function buildRevealPayload(
  homeworkId: string,
  questionId: string
): Promise<RevealPayload | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true },
  });
  if (!question) return null;

  const answers = await prisma.answer.findMany({ where: { questionId } });
  const optionCounts: Record<string, number> = {};
  for (const opt of question.options) optionCounts[opt.id] = 0;
  let paragraphSubmitted = 0;
  for (const a of answers) {
    if (a.selectedOptionId) {
      optionCounts[a.selectedOptionId] = (optionCounts[a.selectedOptionId] ?? 0) + 1;
    }
    if (question.type === "PARAGRAPH" && a.textAnswer) paragraphSubmitted++;
  }

  const leaderboard = await getLeaderboard(homeworkId);
  return {
    questionId,
    type: question.type,
    correctOptionId: question.options.find((o) => o.isCorrect)?.id ?? null,
    optionCounts,
    paragraphSubmitted,
    leaderboard,
  };
}

/**
 * The current live-game state for `homeworkId`. Pass `studentId` (always
 * server-derived - see getStudentForHomework - never client-supplied) to
 * also include that student's own answer for the active question, so a page
 * reload mid-question or mid-reveal restores "locked in" / their result
 * instead of resetting it. Used both for the initial server-rendered paint
 * (host/play pages) and to resync a client after a Realtime reconnect.
 */
export async function getLiveState(
  homeworkId: string,
  studentId?: string
): Promise<LiveState | null> {
  const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
  if (!homework || homework.mode !== "LIVE") return null;

  const players = await fetchPlayers(homeworkId);

  async function myAnswer(questionId: string): Promise<YourResultPayload | null> {
    if (!studentId) return null;
    const a = await prisma.answer.findUnique({
      where: { studentId_questionId: { studentId, questionId } },
    });
    return a ? { questionId, isCorrect: a.isCorrect, pointsAwarded: a.pointsAwarded } : null;
  }

  if (
    homework.livePhase === "QUESTION" &&
    homework.currentQuestionIndex != null &&
    homework.questionStartedAt
  ) {
    const [question, total] = await Promise.all([
      prisma.question.findFirst({
        where: { homeworkId, order: homework.currentQuestionIndex },
        include: { options: { orderBy: { order: "asc" } } },
      }),
      prisma.question.count({ where: { homeworkId } }),
    ]);
    if (question) {
      const payload: ClientQuestion = {
        questionId: question.id,
        index: homework.currentQuestionIndex,
        total,
        type: question.type,
        text: question.text,
        points: question.points,
        timeLimitSec: question.timeLimitSec,
        options: question.options.map((o) => ({ id: o.id, text: o.text })),
        startedAt: homework.questionStartedAt.getTime(),
      };
      return { phase: "QUESTION", players, question: payload, yourAnswer: await myAnswer(question.id) };
    }
  }

  if (homework.livePhase === "REVEAL" && homework.currentQuestionIndex != null) {
    const question = await prisma.question.findFirst({
      where: { homeworkId, order: homework.currentQuestionIndex },
    });
    if (question) {
      const reveal = await buildRevealPayload(homeworkId, question.id);
      if (reveal) {
        return { phase: "REVEAL", players, reveal, yourAnswer: await myAnswer(question.id) };
      }
    }
  }

  if (homework.livePhase === "FINISHED") {
    return { phase: "FINISHED", players, finished: { leaderboard: await getLeaderboard(homeworkId) } };
  }

  return { phase: "LOBBY", players };
}

async function startQuestion(homeworkId: string, index: number): Promise<ClientQuestion | null> {
  const [question, total] = await Promise.all([
    prisma.question.findFirst({
      where: { homeworkId, order: index },
      include: { options: { orderBy: { order: "asc" } } },
    }),
    prisma.question.count({ where: { homeworkId } }),
  ]);
  if (!question) return null;

  const startedAt = new Date();
  await prisma.homework.update({
    where: { id: homeworkId },
    data: { livePhase: "QUESTION", currentQuestionIndex: index, questionStartedAt: startedAt },
  });

  const payload: ClientQuestion = {
    questionId: question.id,
    index,
    total,
    type: question.type,
    text: question.text,
    points: question.points,
    timeLimitSec: question.timeLimitSec,
    options: question.options.map((o) => ({ id: o.id, text: o.text })),
    startedAt: startedAt.getTime(),
  };
  await broadcast(homeworkId, "phase:question", payload);
  return payload;
}

/**
 * Moves QUESTION -> REVEAL. Guarded with an atomic `updateMany` filtered on
 * the current phase so a race between the host's manual "Reveal" click and
 * an expiring auto-reveal (or several students' clocks hitting zero at once)
 * only broadcasts once - whichever call wins the race still gets the
 * correct payload back, it just doesn't re-broadcast.
 */
async function transitionToReveal(
  homeworkId: string,
  questionId: string
): Promise<RevealPayload | null> {
  const payload = await buildRevealPayload(homeworkId, questionId);
  if (!payload) return null;

  const { count } = await prisma.homework.updateMany({
    where: { id: homeworkId, livePhase: "QUESTION" },
    data: { livePhase: "REVEAL" },
  });
  if (count > 0) {
    await broadcast(homeworkId, "phase:reveal", payload);
  }
  return payload;
}

async function finishGame(homeworkId: string): Promise<FinishedPayload> {
  const leaderboard = await getLeaderboard(homeworkId);
  const payload: FinishedPayload = { leaderboard };
  await prisma.homework.update({ where: { id: homeworkId }, data: { livePhase: "FINISHED" } });
  await broadcast(homeworkId, "phase:finished", payload);
  return payload;
}

export async function hostStartGame(homeworkId: string): Promise<ClientQuestion> {
  if (!(await canManageHomework(homeworkId))) throw new Error("Not authorized");
  const payload = await startQuestion(homeworkId, 0);
  if (!payload) throw new Error("Add at least one question first");
  return payload;
}

/** Host cutting a question short - the "Reveal answer" button, before time's up. */
export async function hostRevealQuestion(homeworkId: string): Promise<RevealPayload> {
  if (!(await canManageHomework(homeworkId))) throw new Error("Not authorized");
  const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
  if (!homework || homework.currentQuestionIndex == null) throw new Error("No active question");
  const question = await prisma.question.findFirst({
    where: { homeworkId, order: homework.currentQuestionIndex },
  });
  if (!question) throw new Error("Question not found");

  const payload = await transitionToReveal(homeworkId, question.id);
  if (!payload) throw new Error("Could not build results");
  return payload;
}

/**
 * Called by ANY connected client (host or student) once its own local
 * countdown reaches zero - there's no long-lived server timer to do this on
 * its own anymore. Safe to expose with no auth check: the server
 * independently re-verifies the question has actually expired before
 * touching anything, so a client can't force an early reveal by calling
 * this directly. Keeps the game moving even if the host's tab isn't around
 * to click "Reveal" the moment time runs out.
 */
export async function autoRevealIfExpired(homeworkId: string): Promise<RevealPayload | null> {
  const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
  if (
    !homework ||
    homework.livePhase !== "QUESTION" ||
    homework.currentQuestionIndex == null ||
    !homework.questionStartedAt
  ) {
    return null;
  }
  const question = await prisma.question.findFirst({
    where: { homeworkId, order: homework.currentQuestionIndex },
  });
  if (!question) return null;

  const elapsedMs = Date.now() - homework.questionStartedAt.getTime();
  if (elapsedMs < question.timeLimitSec * 1000) return null; // not actually expired - ignore

  return transitionToReveal(homeworkId, question.id);
}

export async function hostNextQuestion(
  homeworkId: string
): Promise<{ done: true; payload: FinishedPayload } | { done: false; payload: ClientQuestion }> {
  if (!(await canManageHomework(homeworkId))) throw new Error("Not authorized");
  const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
  if (!homework) throw new Error("Not found");

  const total = await prisma.question.count({ where: { homeworkId } });
  const nextIndex = (homework.currentQuestionIndex ?? -1) + 1;

  if (nextIndex >= total) {
    return { done: true, payload: await finishGame(homeworkId) };
  }
  const payload = await startQuestion(homeworkId, nextIndex);
  if (!payload) throw new Error("Question not found");
  return { done: false, payload };
}

export async function hostEndGame(homeworkId: string): Promise<FinishedPayload> {
  if (!(await canManageHomework(homeworkId))) throw new Error("Not authorized");
  return finishGame(homeworkId);
}

/**
 * A true do-over: removes every student who joined this homework (which
 * cascades to delete their answers too - see Answer.student's onDelete:
 * Cascade) and resets the live session back to an empty lobby. Not just a
 * score reset - a student's browser still holds a cookie pointing at their
 * now-deleted Student row, so getStudentForHomework() will find nothing for
 * them next time and they have to rejoin with the join code, same as
 * someone who never played this homework before.
 */
export async function hostRestartGame(homeworkId: string): Promise<LivePlayer[]> {
  if (!(await canManageHomework(homeworkId))) throw new Error("Not authorized");

  await prisma.student.deleteMany({ where: { homeworkId } });
  await prisma.homework.update({
    where: { id: homeworkId },
    data: { livePhase: "LOBBY", currentQuestionIndex: null, questionStartedAt: null },
  });

  // "phase:lobby" here specifically means "the host restarted - your student
  // record is gone, go rejoin" (see LiveGame.tsx), not just "state reset".
  await broadcast(homeworkId, "phase:lobby", {});
  const players = await fetchPlayers(homeworkId); // empty now, but keeps the host's lobby view in sync via the same path as a real join
  await broadcast(homeworkId, "lobby:update", { students: players });
  return players;
}

/** Called once by a student's client on mount (and on Realtime resync) - re-broadcasts the lobby roster and returns this student's current view of the game. */
export async function studentJoinLobby(homeworkId: string): Promise<LiveState | null> {
  const student = await getStudentForHomework(homeworkId);
  if (!student) return null;

  const players = await fetchPlayers(homeworkId);
  await broadcast(homeworkId, "lobby:update", { students: players });
  return getLiveState(homeworkId, student.id);
}

export async function studentSubmitAnswer(
  homeworkId: string,
  questionId: string,
  answer: { selectedOptionId?: string; textAnswer?: string }
): Promise<YourResultPayload | null> {
  const student = await getStudentForHomework(homeworkId);
  if (!student) return null;

  const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
  if (!homework || homework.livePhase !== "QUESTION") return null;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true },
  });
  if (!question || question.homeworkId !== homeworkId) return null;

  const existing = await prisma.answer.findUnique({
    where: { studentId_questionId: { studentId: student.id, questionId } },
  });
  if (existing) {
    // Already answered - return the original result rather than letting a
    // retry/double-click recompute (LIVE scoring is time-sensitive).
    return { questionId, isCorrect: existing.isCorrect, pointsAwarded: existing.pointsAwarded };
  }

  let isCorrect: boolean | null = null;
  let pointsAwarded = 0;
  if (question.type === "MULTIPLE_CHOICE") {
    const opt = question.options.find((o) => o.id === answer.selectedOptionId);
    isCorrect = !!opt?.isCorrect;
    pointsAwarded = computeMultipleChoicePoints({
      isCorrect,
      basePoints: question.points,
      mode: "LIVE",
      elapsedMs: Date.now() - (homework.questionStartedAt?.getTime() ?? Date.now()),
      timeLimitSec: question.timeLimitSec,
    });
  }

  try {
    await prisma.answer.create({
      data: {
        studentId: student.id,
        questionId,
        selectedOptionId: answer.selectedOptionId ?? null,
        textAnswer: answer.textAnswer ?? null,
        isCorrect,
        pointsAwarded,
      },
    });
  } catch {
    // Unique constraint race (e.g. a double-submit) - fall back to whatever
    // actually landed first rather than erroring the student's click.
    const raced = await prisma.answer.findUnique({
      where: { studentId_questionId: { studentId: student.id, questionId } },
    });
    if (raced) return { questionId, isCorrect: raced.isCorrect, pointsAwarded: raced.pointsAwarded };
    throw new Error("Could not save answer");
  }

  const [answeredCount, total] = await Promise.all([
    prisma.answer.count({ where: { questionId } }),
    prisma.student.count({ where: { homeworkId } }),
  ]);
  await broadcast(homeworkId, "answer:count", { answered: answeredCount, total });

  return { questionId, isCorrect, pointsAwarded };
}
