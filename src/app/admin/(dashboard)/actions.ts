"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroyAdminSession, getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/tokens";

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function duplicateHomework(homeworkId: string) {
  if (!(await getAdminSession())) redirect("/admin/login");

  const original = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });
  if (!original) return;

  // Join codes are short and drawn from a large alphabet - collisions are
  // rare, but retry a few times just in case (same approach as homeworks/actions.ts).
  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.homework.findUnique({ where: { joinCode } });
    if (!clash) break;
    joinCode = generateJoinCode();
  }

  await prisma.homework.create({
    data: {
      title: `${original.title} (copy)`,
      description: original.description,
      mode: original.mode,
      status: "DRAFT",
      joinCode,
      questions: {
        create: original.questions.map((q) => ({
          order: q.order,
          type: q.type,
          text: q.text,
          points: q.points,
          timeLimitSec: q.timeLimitSec,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              order: o.order,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin");
}
