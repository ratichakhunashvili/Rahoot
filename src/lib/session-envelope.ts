import "server-only";
import { cookies } from "next/headers";
import {
  sessionCookieName,
  sessionCookieMaxAgeSeconds,
  signSessionEnvelope,
  verifySessionEnvelope,
  type SessionEnvelope,
} from "@/lib/session-core";

/** Reads and verifies the shared `__session` cookie for the current request. Empty object if missing/invalid - never throws. */
export async function readSessionEnvelope(): Promise<SessionEnvelope> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (!token) return {};
  return verifySessionEnvelope(token);
}

/** Re-signs and writes the whole envelope back. Callers must read-modify-write (not blind-write) so they don't clobber the other sub-session sharing this cookie. */
export async function writeSessionEnvelope(envelope: SessionEnvelope): Promise<void> {
  const cookieStore = await cookies();
  const token = await signSessionEnvelope(envelope);
  cookieStore.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAgeSeconds(),
  });
}
