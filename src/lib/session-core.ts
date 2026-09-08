import { SignJWT, jwtVerify } from "jose";

// Pure JWT/envelope helpers with no dependency on "next/headers" or the
// "server-only" package, so this file can be safely imported both by
// Next.js route/action code AND by server.ts (which runs under plain Node
// via tsx, outside of Next's bundler - "server-only" throws unconditionally
// in that context).
//
// Everything lives in ONE cookie, "__session", holding a single signed JSON
// envelope with an optional admin sub-session and any number of per-homework
// student sub-sessions. This is forced by Firebase Hosting: when a request
// is proxied through a Hosting rewrite to a Cloud Run backend, Firebase
// strips every cookie except one literally named "__session" before it
// reaches the app - so this app, which needs an admin session AND
// potentially several simultaneous student sessions, has to fit all of it
// into that one slot instead of one cookie per concern.

const SESSION_COOKIE_NAME = "__session";
const ENVELOPE_TTL = "30d"; // outer JWT expiry - also the effective cap on how long a student session can last
const ADMIN_TTL_SECONDS = 60 * 60 * 12; // admin's own, shorter-lived expiry, checked separately below
const MAX_STUDENT_ENTRIES = 20; // safety cap so the cookie can't grow past the ~4KB browser limit

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export type AdminSessionPayload = { email: string };
export type StudentSessionEntry = { studentId: string; clientToken: string };
export type SessionEnvelope = {
  admin?: AdminSessionPayload & { exp: number };
  // Keyed by homeworkId - a student can be mid-way through several
  // different homeworks at once, each needing its own entry.
  students?: Record<string, StudentSessionEntry>;
};

export function sessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function sessionCookieMaxAgeSeconds() {
  return 60 * 60 * 24 * 30; // matches ENVELOPE_TTL
}

export async function signSessionEnvelope(envelope: SessionEnvelope): Promise<string> {
  return new SignJWT({ envelope })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ENVELOPE_TTL)
    .sign(getSecretKey());
}

export async function verifySessionEnvelope(token: string): Promise<SessionEnvelope> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const envelope = payload.envelope;
    return envelope && typeof envelope === "object" ? (envelope as SessionEnvelope) : {};
  } catch {
    return {};
  }
}

export function newAdminEntry(email: string): NonNullable<SessionEnvelope["admin"]> {
  return { email, exp: Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS };
}

export function adminFromEnvelope(envelope: SessionEnvelope): AdminSessionPayload | null {
  const admin = envelope.admin;
  if (!admin || admin.exp <= Math.floor(Date.now() / 1000)) return null;
  return { email: admin.email };
}

/** Merges in a student entry, evicting the oldest one first if that would push the count over MAX_STUDENT_ENTRIES. */
export function withStudentEntry(
  envelope: SessionEnvelope,
  homeworkId: string,
  entry: StudentSessionEntry
): SessionEnvelope {
  const students = { ...envelope.students, [homeworkId]: entry };
  const keys = Object.keys(students);
  if (keys.length > MAX_STUDENT_ENTRIES) {
    // Object key insertion order is preserved for string keys, so the
    // first key is the oldest entry (unless it's the one we just set).
    const oldest = keys.find((k) => k !== homeworkId);
    if (oldest) delete students[oldest];
  }
  return { ...envelope, students };
}

// --- Backward-compatible admin-only surface, used by server.ts (raw
// Socket.IO handshake cookies, outside Next's cookies() API) and proxy.ts
// (reads the raw cookie itself rather than through session.ts). Both only
// ever needed "cookie name in, admin payload out" - that contract is
// unchanged even though the cookie now holds a shared envelope.
export function adminSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  return adminFromEnvelope(await verifySessionEnvelope(token));
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
