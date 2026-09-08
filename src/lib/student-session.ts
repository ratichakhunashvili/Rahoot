import "server-only";
import { prisma } from "@/lib/prisma";
import { withStudentEntry } from "@/lib/session-core";
import { readSessionEnvelope, writeSessionEnvelope } from "@/lib/session-envelope";

// A student "session" is just an entry in the shared session envelope
// remembering which Student row is theirs for one specific homework - there
// is no password or account, so re-opening the join link on the same
// device resumes the same entry instead of creating a duplicate leaderboard
// row. Keyed by homeworkId since a student can be partway through several
// homeworks at once.

export async function setStudentCookie(
  homeworkId: string,
  studentId: string,
  clientToken: string
) {
  const envelope = await readSessionEnvelope();
  await writeSessionEnvelope(withStudentEntry(envelope, homeworkId, { studentId, clientToken }));
}

export async function getStudentForHomework(homeworkId: string) {
  const envelope = await readSessionEnvelope();
  const entry = envelope.students?.[homeworkId];
  if (!entry) return null;

  return prisma.student.findFirst({
    where: { id: entry.studentId, homeworkId, clientToken: entry.clientToken },
  });
}
