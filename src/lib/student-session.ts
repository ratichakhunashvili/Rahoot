import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// A student "session" is just a cookie remembering which Student row is
// theirs for one specific homework - there is no password or account, so
// re-opening the join link on the same device resumes the same entry
// instead of creating a duplicate leaderboard row.

function cookieNameFor(homeworkId: string) {
  return `rahoot_student_${homeworkId}`;
}

export async function setStudentCookie(
  homeworkId: string,
  studentId: string,
  clientToken: string
) {
  const cookieStore = await cookies();
  cookieStore.set(cookieNameFor(homeworkId), `${studentId}.${clientToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days - a homework may stay open for a while
  });
}

export async function getStudentForHomework(homeworkId: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(cookieNameFor(homeworkId))?.value;
  if (!raw) return null;

  const [studentId, clientToken] = raw.split(".");
  if (!studentId || !clientToken) return null;

  return prisma.student.findFirst({
    where: { id: studentId, homeworkId, clientToken },
  });
}
