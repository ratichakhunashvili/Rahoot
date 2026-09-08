import "server-only";
import { cookies } from "next/headers";
import {
  adminSessionCookieName,
  adminSessionMaxAgeSeconds,
  signAdminToken,
  verifyAdminToken,
  verifyAdminCredentials,
  type AdminSessionPayload,
} from "@/lib/session-core";

export {
  adminSessionCookieName,
  verifyAdminToken,
  verifyAdminCredentials,
  type AdminSessionPayload,
};

export async function createAdminSession(email: string) {
  const token = await signAdminToken(email);
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: adminSessionMaxAgeSeconds(),
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookieName());
}

/** Verifies the admin session cookie for the *current request*. Returns null if missing/invalid. */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName())?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
