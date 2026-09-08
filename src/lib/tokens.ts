import { customAlphabet } from "nanoid";

// No look-alike characters (0/O, 1/I/L) so a human can type a join code correctly.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Short, human-typeable join code students can enter as a QR-code fallback. */
export function generateJoinCode(): string {
  return customAlphabet(CODE_ALPHABET, 6)();
}

/** Opaque per-student token stored in a browser cookie, not a real credential. */
export function generateClientToken(): string {
  return customAlphabet(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    32
  )();
}
