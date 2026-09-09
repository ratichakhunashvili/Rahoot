import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/scoring";
import { Leaderboard } from "@/components/Leaderboard";

export default async function AdminLeaderboardPage({
  params,
}: PageProps<"/homeworks/[id]/leaderboard">) {
  const { id } = await params;
  const homework = await prisma.homework.findUnique({ where: { id } });
  if (!homework) notFound();

  const entries = await getLeaderboard(id);

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/homeworks/${id}`} className="text-sm text-rahoot-red hover:underline">
        &larr; Back to homework
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{homework.title} - Leaderboard</h1>
      <div className="mt-6">
        <Leaderboard entries={entries} />
      </div>
    </div>
  );
}
