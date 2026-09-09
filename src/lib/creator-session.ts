import "server-only";
import { withCreatorEntry } from "@/lib/session-core";
import { readSessionEnvelope, writeSessionEnvelope } from "@/lib/session-envelope";

// A "creator" session is the no-registration equivalent of the admin
// session: an entry in the shared session envelope remembering which
// homeworks THIS browser created, so it can come back and edit/host them
// without ever logging in. Keyed by homeworkId, verified against
// Homework.creatorToken (see homework-auth.ts) - same shape as
// student-session.ts's per-homework entries, just for the creator side.

export async function setCreatorCookie(homeworkId: string, creatorToken: string) {
  const envelope = await readSessionEnvelope();
  await writeSessionEnvelope(withCreatorEntry(envelope, homeworkId, creatorToken));
}

export async function getCreatorTokenForHomework(homeworkId: string): Promise<string | null> {
  const envelope = await readSessionEnvelope();
  return envelope.creators?.[homeworkId] ?? null;
}

/** Every homeworkId this browser has a creator entry for, most-recently-created last (insertion order). */
export async function getMyCreatedHomeworkIds(): Promise<string[]> {
  const envelope = await readSessionEnvelope();
  return Object.keys(envelope.creators ?? {});
}
