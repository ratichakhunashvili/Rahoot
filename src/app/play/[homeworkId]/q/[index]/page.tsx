import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentForHomework } from "@/lib/student-session";
import { submitAsyncAnswer } from "../../actions";
import { AsyncOptions } from "./AsyncOptions";

export default async function AsyncQuestionPage({
  params,
}: PageProps<"/play/[homeworkId]/q/[index]">) {
  const { homeworkId, index: indexParam } = await params;
  const index = Number(indexParam);

  const student = await getStudentForHomework(homeworkId);
  if (!student) redirect("/join");
  if (student.finishedAt) redirect(`/play/${homeworkId}/done`);

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
  });
  if (!homework || homework.mode !== "ASYNC") notFound();

  const total = homework.questions.length;
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    redirect(`/play/${homeworkId}`);
  }

  const question = homework.questions[index];
  const existingAnswer = await prisma.answer.findUnique({
    where: { studentId_questionId: { studentId: student.id, questionId: question.id } },
  });

  const action = submitAsyncAnswer.bind(null, homeworkId, question.id, index, total);
  const isLast = index === total - 1;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
      <p className="text-center text-sm font-bold uppercase tracking-wide text-rahoot-red">
        Question {index + 1} of {total}
      </p>
      <h1 className="mt-2 text-center text-xl font-bold">{question.text}</h1>

      <form action={action} className="mt-8 flex flex-col gap-3">
        {question.type === "MULTIPLE_CHOICE" ? (
          <AsyncOptions
            options={question.options}
            defaultSelectedId={existingAnswer?.selectedOptionId ?? null}
          />
        ) : (
          <textarea
            name="textAnswer"
            required
            rows={6}
            maxLength={5000}
            defaultValue={existingAnswer?.textAnswer ?? ""}
            placeholder="Write your answer..."
            className="input"
            autoFocus
          />
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          {index > 0 ? (
            <Link href={`/play/${homeworkId}/q/${index - 1}`} className="btn btn-outline">
              Previous
            </Link>
          ) : (
            <span />
          )}
          {question.type === "PARAGRAPH" && (
            <button type="submit" className="btn btn-primary">
              {isLast ? "Finish" : "Next"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
