import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HostClient } from "./HostClient";

export default async function HostLivePage({
  params,
}: PageProps<"/admin/homeworks/[id]/host">) {
  const { id } = await params;
  const homework = await prisma.homework.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } },
  });
  if (!homework || homework.mode !== "LIVE") notFound();

  return (
    <HostClient
      homeworkId={homework.id}
      title={homework.title}
      totalQuestions={homework._count.questions}
    />
  );
}
