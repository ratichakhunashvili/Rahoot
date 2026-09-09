"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canManageHomework } from "@/lib/homework-auth";

export async function gradeAnswer(
  homeworkId: string,
  answerId: string,
  formData: FormData
) {
  if (!(await canManageHomework(homeworkId))) notFound();

  const verdict = String(formData.get("verdict") || "");
  const points = Math.max(0, Number(formData.get("points")) || 0);
  if (verdict !== "correct" && verdict !== "incorrect") return;

  await prisma.answer.update({
    where: { id: answerId },
    data: {
      isCorrect: verdict === "correct",
      pointsAwarded: verdict === "correct" ? points : 0,
      gradedAt: new Date(),
    },
  });

  revalidatePath(`/homeworks/${homeworkId}/grade`);
  revalidatePath(`/homeworks/${homeworkId}/leaderboard`);
}
