import { SignJWT, jwtVerify } from "jose";

// Pure JWT helpers with no dependency on "next/headers" or the "server-only"
// package, so this file can be safely imported both by Next.js route/action
// code AND by server.ts (which runs under plain Node via tsx, outside of
// Next's bundler - "server-only" throws unconditionally in that context).

const COOKIE_NAME = "rahoot_admin_session";
const SESSION_TTL = "12h";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export type AdminSessionPayload = {
  email: string;
};

export function adminSessionCookieName() {
  return COOKIE_NAME;
}

export function adminSessionMaxAgeSeconds() {
  return 60 * 60 * 12; // matches SESSION_TTL
}

export async function signAdminToken(email: string): Promise<string> {
  return new SignJWT({ email } satisfies AdminSessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecretKey());
}

export async function verifyAdminToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.email !== "string") return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function verifyAdminCredentials(email: string, password: string) {
  const validEmail = process.env.ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validEmail || !validPassword) {
    throw new Error("ADMIN_EMAIL / ADMIN_PASSWORD are not configured");
  }
  return (
    email.trim().toLowerCase() === validEmail.trim().toLowerCase() &&
    password === validPassword
  );
}
