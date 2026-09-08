"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function gradeAnswer(
  homeworkId: string,
  answerId: string,
  formData: FormData
) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

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

  revalidatePath(`/admin/homeworks/${homeworkId}/grade`);
  revalidatePath(`/admin/homeworks/${homeworkId}/leaderboard`);
}
