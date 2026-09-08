"use server";

import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentForHomework } from "@/lib/student-session";
import { computeMultipleChoicePoints } from "@/lib/scoring";

export async function submitAsyncAnswer(
  homeworkId: string,
  questionId: string,
  index: number,
  total: number,
  formData: FormData
) {
  const student = await getStudentForHomework(homeworkId);
  if (!student) redirect("/join");
  if (student.finishedAt) redirect(`/play/${homeworkId}/done`);

  const question = await prisma.question.findFirst({
    where: { id: questionId, homeworkId },
    include: { options: true },
  });
  if (!question) notFound();

  const selectedOptionId =
    question.type === "MULTIPLE_CHOICE"
      ? String(formData.get("optionId") || "") || null
      : null;
  const textAnswer =
    question.type === "PARAGRAPH"
      ? String(formData.get("textAnswer") || "").slice(0, 5000) || null
      : null;

  let isCorrect: boolean | null = null;
  let pointsAwarded = 0;
  if (question.type === "MULTIPLE_CHOICE") {
    const opt = question.options.find((o) => o.id === selectedOptionId);
    isCorrect = !!opt?.isCorrect;
    pointsAwarded = computeMultipleChoicePoints({
      isCorrect,
      basePoints: question.points,
      mode: "ASYNC",
      elapsedMs: 0,
      timeLimitSec: question.timeLimitSec,
    });
  }

  await prisma.answer.upsert({
    where: { studentId_questionId: { studentId: student.id, questionId } },
    create: {
      studentId: student.id,
      questionId,
      selectedOptionId,
      textAnswer,
      isCorrect,
      pointsAwarded,
    },
    update: { selectedOptionId, textAnswer, isCorrect, pointsAwarded },
  });

  const nextIndex = index + 1;
  if (nextIndex >= total) {
    await prisma.student.update({
      where: { id: student.id },
      data: { finishedAt: student.finishedAt ?? new Date() },
    });
    redirect(`/play/${homeworkId}/done`);
  } else {
    redirect(`/play/${homeworkId}/q/${nextIndex}`);
  }
}
