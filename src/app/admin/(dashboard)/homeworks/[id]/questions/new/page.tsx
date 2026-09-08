import Link from "next/link";
import { createQuestion } from "../../actions";
import { QuestionForm } from "../QuestionForm";

export default async function NewQuestionPage({
  params,
  searchParams,
}: PageProps<"/admin/homeworks/[id]/questions/new">) {
  const { id } = await params;
  const search = await searchParams;
  const error = typeof search?.error === "string" ? search.error : null;

  const action = createQuestion.bind(null, id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/admin/homeworks/${id}`} className="text-sm text-rahoot-red hover:underline">
        &larr; Back to homework
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Add a question</h1>

      <div className="mt-6">
        <QuestionForm action={action} error={error} submitLabel="Add question" />
      </div>
    </div>
  );
}
