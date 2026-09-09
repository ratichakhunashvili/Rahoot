import "server-only";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { getCreatorTokenForHomework } from "@/lib/creator-session";

/**
 * True if the current request is either the logged-in admin, or holds the
 * matching creator-token cookie for this specific homework. This is the one
 * check every homework-management page/action gates on - admin can manage
 * every homework ever created; a no-registration creator can only manage
 * the ones their own browser made.
 */
export async function canManageHomework(homeworkId: string): Promise<boolean> {
  const admin = await getAdminSession();
  if (admin) return true;

  const token = await getCreatorTokenForHomework(homeworkId);
  if (!token) return false;

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { creatorToken: true },
  });
  return !!homework && homework.creatorToken === token;
}
