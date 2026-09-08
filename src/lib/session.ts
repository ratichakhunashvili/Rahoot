import "server-only";
import {
  adminSessionCookieName,
  verifyAdminToken,
  verifyAdminCredentials,
  adminFromEnvelope,
  newAdminEntry,
  type AdminSessionPayload,
} from "@/lib/session-core";
import { readSessionEnvelope, writeSessionEnvelope } from "@/lib/session-envelope";

export {
  adminSessionCookieName,
  verifyAdminToken,
  verifyAdminCredentials,
  type AdminSessionPayload,
};

export async function createAdminSession(email: string) {
  const envelope = await readSessionEnvelope();
  envelope.admin = newAdminEntry(email);
  await writeSessionEnvelope(envelope);
}

export async function destroyAdminSession() {
  const envelope = await readSessionEnvelope();
  delete envelope.admin;
  await writeSessionEnvelope(envelope);
}

/** Verifies the admin sub-session for the *current request*. Returns null if missing/expired. */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  return adminFromEnvelope(await readSessionEnvelope());
}
