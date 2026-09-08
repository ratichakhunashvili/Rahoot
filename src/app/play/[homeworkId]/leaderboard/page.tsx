import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/scoring";
import { Leaderboard } from "@/components/Leaderboard";

export default async function PublicLeaderboardPage({
  params,
}: PageProps<"/play/[homeworkId]/leaderboard">) {
  const { homeworkId } = await params;
  const homework = await prisma.homework.findUnique({ where: { id: homeworkId } });
  if (!homework || homework.status === "DRAFT") notFound();

  const entries = await getLeaderboard(homeworkId);

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-10">
      <p className="text-center text-sm font-bold uppercase tracking-wide text-rahoot-red">
        {homework.title}
      </p>
      <h1 className="mt-1 text-center text-2xl font-bold">Leaderboard</h1>
      <div className="mt-6">
        <Leaderboard entries={entries} />
      </div>
    </div>
  );
}
