import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { gradeAnswer } from "./actions";

export default async function GradeHomeworkPage({
  params,
}: PageProps<"/admin/homeworks/[id]/grade">) {
  const { id } = await params;
  const homework = await prisma.homework.findUnique({ where: { id } });
  if (!homework) notFound();

  const pending = await prisma.answer.findMany({
    where: { question: { homeworkId: id, type: "PARAGRAPH" }, isCorrect: null },
    include: { student: true, question: true },
    orderBy: { answeredAt: "asc" },
  });

  const graded = await prisma.answer.findMany({
    where: { question: { homeworkId: id, type: "PARAGRAPH" }, isCorrect: { not: null } },
    include: { student: true, question: true },
    orderBy: { gradedAt: "desc" },
    take: 25,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/admin/homeworks/${id}`} className="text-sm text-rahoot-red hover:underline">
        &larr; Back to homework
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{homework.title} - Grade answers</h1>

      <section className="mt-6">
        <h2 className="font-bold">
          Pending <span className="font-normal text-rahoot-muted">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-rahoot-muted">Nothing left to grade.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {pending.map((a) => {
              const action = gradeAnswer.bind(null, id, a.id);
              return (
                <li key={a.id} className="card p-4">
                  <p className="text-sm font-semibold text-rahoot-muted">
                    {a.student.firstName} {a.student.lastName}
                  </p>
                  <p className="mt-1 font-medium">{a.question.text}</p>
                  <p className="mt-2 rounded-lg bg-zinc-900 p-3 text-sm whitespace-pre-wrap">
                    {a.textAnswer || <em className="text-rahoot-muted">No answer submitted</em>}
                  </p>
                  <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1 text-sm font-semibold">
                      <input type="radio" name="verdict" value="correct" required /> Correct
                    </label>
                    <label className="flex items-center gap-1 text-sm font-semibold">
                      <input type="radio" name="verdict" value="incorrect" required /> Incorrect
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      Points
                      <input
                        type="number"
                        name="points"
                        min={0}
                        max={a.question.points}
                        defaultValue={a.question.points}
                        className="input !w-24 !py-1"
                      />
                    </label>
                    <button type="submit" className="btn btn-primary !py-1.5 !px-4 text-sm">
                      Save
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {graded.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">Recently graded</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {graded.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-rahoot-border p-3 text-sm">
                <span>
                  {a.student.firstName} {a.student.lastName} &middot; {a.question.text}
                </span>
                <span className={a.isCorrect ? "font-bold text-green-700" : "font-bold text-rahoot-red"}>
                  {a.isCorrect ? `+${a.pointsAwarded}` : "0"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
