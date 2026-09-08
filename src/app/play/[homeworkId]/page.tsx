import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentForHomework } from "@/lib/student-session";
import { LiveGame } from "./LiveGame";

export default async function PlayHomeworkPage({
  params,
}: PageProps<"/play/[homeworkId]">) {
  const { homeworkId } = await params;

  const student = await getStudentForHomework(homeworkId);
  if (!student) redirect("/join");

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { questions: { orderBy: { order: "asc" }, select: { id: true } } },
  });
  if (!homework) notFound();

  if (homework.mode === "LIVE") {
    return (
      <LiveGame
        homeworkId={homework.id}
        homeworkTitle={homework.title}
        studentId={student.id}
        clientToken={student.clientToken}
        firstName={student.firstName}
      />
    );
  }

  // ASYNC: jump straight to the next unanswered question, or the results page.
  if (homework.questions.length === 0) {
    return (
      <Centered>
        <p className="text-lg font-semibold">No questions yet</p>
        <p className="mt-1 text-sm text-rahoot-muted">
          Your teacher hasn&apos;t added any questions to this homework yet.
        </p>
      </Centered>
    );
  }

  if (student.finishedAt) {
    redirect(`/play/${homeworkId}/done`);
  }

  const answeredCount = await prisma.answer.count({
    where: { studentId: student.id, question: { homeworkId } },
  });
  const nextIndex = Math.min(answeredCount, homework.questions.length - 1);
  redirect(`/play/${homeworkId}/q/${nextIndex}`);
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {children}
    </div>
  );
}
