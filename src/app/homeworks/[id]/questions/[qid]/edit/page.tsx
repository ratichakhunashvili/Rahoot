import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateQuestion } from "../../../actions";
import { QuestionForm, type QuestionDefaults } from "../../QuestionForm";

export default async function EditQuestionPage({
  params,
  searchParams,
}: PageProps<"/homeworks/[id]/questions/[qid]/edit">) {
  const { id, qid } = await params;
  const search = await searchParams;
  const error = typeof search?.error === "string" ? search.error : null;

  const question = await prisma.question.findFirst({
    where: { id: qid, homeworkId: id },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!question) notFound();

  const defaults: QuestionDefaults = {
    text: question.text,
    type: question.type,
    points: question.points,
    timeLimitSec: question.timeLimitSec,
    options: question.options.map((o) => o.text),
    correctIndex:
      question.options.findIndex((o) => o.isCorrect) >= 0
        ? question.options.findIndex((o) => o.isCorrect) + 1
        : null,
  };

  const action = updateQuestion.bind(null, id, qid);

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/homeworks/${id}`} className="text-sm text-rahoot-red hover:underline">
        &larr; Back to homework
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit question</h1>

      <div className="mt-6">
        <QuestionForm action={action} defaults={defaults} error={error} submitLabel="Save changes" />
      </div>
    </div>
  );
}
