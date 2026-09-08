import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateJoinQrDataUrl, joinUrlForCode } from "@/lib/qr";
import {
  updateHomeworkDetails,
  setHomeworkStatus,
  deleteHomework,
  deleteQuestion,
} from "./actions";
import { DeleteHomeworkButton } from "./DeleteHomeworkButton";

const STATUS_FLOW: Array<{ value: "DRAFT" | "OPEN" | "CLOSED"; label: string; hint: string }> = [
  { value: "DRAFT", label: "Draft", hint: "Hidden - QR code doesn't work yet" },
  { value: "OPEN", label: "Open", hint: "Students can scan the QR code and join" },
  { value: "CLOSED", label: "Closed", hint: "No new students, results kept for the leaderboard" },
];

export default async function ManageHomeworkPage({
  params,
  searchParams,
}: PageProps<"/admin/homeworks/[id]">) {
  const { id } = await params;
  const search = await searchParams;
  const detailsError = search?.error === "title";

  const homework = await prisma.homework.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" }, include: { options: true } },
      _count: { select: { students: true } },
    },
  });
  if (!homework) notFound();

  const qrDataUrl = await generateJoinQrDataUrl(homework.joinCode);
  const joinUrl = joinUrlForCode(homework.joinCode);
  const hasParagraphQuestions = homework.questions.some((q) => q.type === "PARAGRAPH");
  const updateDetails = updateHomeworkDetails.bind(null, homework.id);
  const removeHomework = deleteHomework.bind(null, homework.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{homework.title}</h1>
            <span className="badge bg-rahoot-red-light text-rahoot-red-dark">
              {homework.mode === "LIVE" ? "Live session" : "Self-paced"}
            </span>
          </div>
          <p className="mt-1 text-sm text-rahoot-muted">
            {homework._count.students} student{homework._count.students === 1 ? "" : "s"} joined
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/homeworks/${homework.id}/leaderboard`} className="btn btn-outline">
            Leaderboard
          </Link>
          {hasParagraphQuestions && (
            <Link href={`/admin/homeworks/${homework.id}/grade`} className="btn btn-outline">
              Grade answers
            </Link>
          )}
          {homework.mode === "LIVE" && (
            <Link href={`/admin/homeworks/${homework.id}/host`} className="btn btn-primary">
              Host live session
            </Link>
          )}
        </div>
      </div>

      <section className="card p-6">
        <h2 className="font-bold">Join code &amp; QR</h2>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div>
            <div className="inline-block rounded-2xl border-4 border-rahoot-red bg-white p-3">
              <Image
                src={qrDataUrl}
                alt={`QR code to join ${homework.title}`}
                width={200}
                height={200}
                unoptimized
                className="rounded-md"
              />
            </div>
            <a
              href={qrDataUrl}
              download={`rahoot-${homework.joinCode}-qr.png`}
              className="mt-2 block text-center text-sm text-rahoot-red hover:underline"
            >
              Download QR
            </a>
          </div>
          <div>
            <p className="text-sm text-rahoot-muted">Join code</p>
            <p className="font-mono text-3xl font-black tracking-widest">{homework.joinCode}</p>
            <p className="mt-3 text-sm text-rahoot-muted">Link</p>
            <a href={joinUrl} className="text-sm text-rahoot-red hover:underline break-all">
              {joinUrl}
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-rahoot-border pt-4">
          {STATUS_FLOW.map((s) => {
            const active = homework.status === s.value;
            const action = setHomeworkStatus.bind(null, homework.id, s.value);
            return (
              <form action={action} key={s.value}>
                <button
                  type="submit"
                  disabled={active}
                  title={s.hint}
                  className={active ? "btn btn-primary" : "btn btn-outline"}
                >
                  {s.label}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-bold">Details</h2>
        <form action={updateDetails} className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-semibold">
            Title
            <input name="title" required maxLength={120} defaultValue={homework.title} className="input mt-1" />
          </label>
          <label className="text-sm font-semibold">
            Description
            <textarea
              name="description"
              maxLength={500}
              rows={2}
              defaultValue={homework.description ?? ""}
              className="input mt-1"
            />
          </label>
          {detailsError && <p className="text-sm font-medium text-rahoot-red">Please enter a title.</p>}
          <button type="submit" className="btn btn-outline self-start">
            Save details
          </button>
        </form>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">
            Questions <span className="font-normal text-rahoot-muted">({homework.questions.length})</span>
          </h2>
          <Link href={`/admin/homeworks/${homework.id}/questions/new`} className="btn btn-primary">
            + Add question
          </Link>
        </div>

        {homework.questions.length === 0 ? (
          <p className="mt-4 text-sm text-rahoot-muted">No questions yet.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-2">
            {homework.questions.map((q, i) => {
              const removeQuestion = deleteQuestion.bind(null, homework.id, q.id);
              return (
                <li key={q.id} className="flex items-center justify-between rounded-lg border border-rahoot-border p-3">
                  <div>
                    <p className="font-semibold">
                      {i + 1}. {q.text}
                    </p>
                    <p className="text-xs text-rahoot-muted">
                      {q.type === "MULTIPLE_CHOICE" ? "Multiple choice" : "Paragraph"} &middot;{" "}
                      {q.points} pts &middot; {q.timeLimitSec}s
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/admin/homeworks/${homework.id}/questions/${q.id}/edit`}
                      className="btn btn-outline !py-1.5 !px-3 text-sm"
                    >
                      Edit
                    </Link>
                    <form action={removeQuestion}>
                      <button type="submit" className="btn btn-outline !py-1.5 !px-3 text-sm">
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <form action={removeHomework} className="self-start">
        <DeleteHomeworkButton title={homework.title} />
      </form>
    </div>
  );
}
