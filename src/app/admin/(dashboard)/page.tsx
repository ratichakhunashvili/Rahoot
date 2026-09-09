import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-800 text-zinc-300",
  OPEN: "bg-green-900 text-green-300",
  CLOSED: "bg-zinc-800 text-zinc-500",
};

export default async function AdminHomePage() {
  const homeworks = await prisma.homework.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { students: true, questions: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homeworks</h1>
        <Link href="/homeworks/new" className="btn btn-primary">
          + New homework
        </Link>
      </div>

      {homeworks.length === 0 ? (
        <p className="mt-8 text-rahoot-muted">
          No homeworks yet. Create your first one to get a join code and QR code.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {homeworks.map((hw) => (
            <li key={hw.id}>
              <Link
                href={`/homeworks/${hw.id}`}
                className="card flex items-center justify-between p-4 hover:border-rahoot-red"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{hw.title}</span>
                    <span className="badge bg-rahoot-red-light text-rahoot-red-dark">
                      {hw.mode}
                    </span>
                    <span className={`badge ${STATUS_STYLES[hw.status]}`}>
                      {hw.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-rahoot-muted">
                    {hw._count.questions} question
                    {hw._count.questions === 1 ? "" : "s"} &middot;{" "}
                    {hw._count.students} student
                    {hw._count.students === 1 ? "" : "s"} joined &middot; code{" "}
                    <span className="font-mono font-semibold">{hw.joinCode}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
