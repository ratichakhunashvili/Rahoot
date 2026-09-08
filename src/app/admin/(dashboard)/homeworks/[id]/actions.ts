"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import type { HomeworkStatus, QuestionType } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
}

export async function updateHomeworkDetails(
  homeworkId: string,
  formData: FormData
) {
  await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) redirect(`/admin/homeworks/${homeworkId}?error=title`);

  await prisma.homework.update({
    where: { id: homeworkId },
    data: { title, description: description || null },
  });
  revalidatePath(`/admin/homeworks/${homeworkId}`);
  redirect(`/admin/homeworks/${homeworkId}`);
}

const VALID_STATUSES: HomeworkStatus[] = ["DRAFT", "OPEN", "CLOSED"];

export async function setHomeworkStatus(homeworkId: string, status: string) {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status as HomeworkStatus)) return;

  await prisma.homework.update({
    where: { id: homeworkId },
    data: { status: status as HomeworkStatus },
  });
  revalidatePath(`/admin/homeworks/${homeworkId}`);
  revalidatePath("/admin");
}

export async function deleteHomework(homeworkId: string) {
  await requireAdmin();
  await prisma.homework.delete({ where: { id: homeworkId } });
  revalidatePath("/admin");
  redirect("/admin");
}

type QuestionFormValues = {
  text: string;
  type: QuestionType;
  points: number;
  timeLimitSec: number;
  options: { text: string; isCorrect: boolean }[];
};

function parseQuestionForm(formData: FormData): QuestionFormValues | { error: string } {
  const text = String(formData.get("text") || "").trim();
  const type = String(formData.get("type") || "MULTIPLE_CHOICE") as QuestionType;
  const points = Math.max(1, Number(formData.get("points")) || 1000);
  const timeLimitSec = Math.max(5, Number(formData.get("timeLimitSec")) || 20);

  if (!text) return { error: "text" };

  if (type === "PARAGRAPH") {
    return { text, type, points, timeLimitSec, options: [] };
  }

  const correctIndex = Number(formData.get("correct"));
  const rawOptions = [1, 2, 3, 4].map((i) =>
    String(formData.get(`opt${i}`) || "").trim()
  );
  const options = rawOptions
    .map((optText, i) => ({ text: optText, isCorrect: i + 1 === correctIndex }))
    .filter((o) => o.text.length > 0);

  if (options.length < 2) return { error: "options" };
  if (!options.some((o) => o.isCorrect)) return { error: "correct" };

  return { text, type: "MULTIPLE_CHOICE", points, timeLimitSec, options };
}

export async function createQuestion(homeworkId: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseQuestionForm(formData);
  if ("error" in parsed) {
    redirect(`/admin/homeworks/${homeworkId}/questions/new?error=${parsed.error}`);
  }

  const count = await prisma.question.count({ where: { homeworkId } });

  await prisma.question.create({
    data: {
      homeworkId,
      order: count,
      text: parsed.text,
      type: parsed.type,
      points: parsed.points,
      timeLimitSec: parsed.timeLimitSec,
      options: {
        create: parsed.options.map((o, i) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          order: i,
        })),
      },
    },
  });

  revalidatePath(`/admin/homeworks/${homeworkId}`);
  redirect(`/admin/homeworks/${homeworkId}`);
}

export async function updateQuestion(
  homeworkId: string,
  questionId: string,
  formData: FormData
) {
  await requireAdmin();
  const parsed = parseQuestionForm(formData);
  if ("error" in parsed) {
    redirect(
      `/admin/homeworks/${homeworkId}/questions/${questionId}/edit?error=${parsed.error}`
    );
  }

  await prisma.$transaction([
    prisma.option.deleteMany({ where: { questionId } }),
    prisma.question.update({
      where: { id: questionId },
      data: {
        text: parsed.text,
        type: parsed.type,
        points: parsed.points,
        timeLimitSec: parsed.timeLimitSec,
        options: {
          create: parsed.options.map((o, i) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            order: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/admin/homeworks/${homeworkId}`);
  redirect(`/admin/homeworks/${homeworkId}`);
}

export async function deleteQuestion(homeworkId: string, questionId: string) {
  await requireAdmin();
  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath(`/admin/homeworks/${homeworkId}`);
  redirect(`/admin/homeworks/${homeworkId}`);
}
