import QRCode from "qrcode";

/** Builds the public URL students scan / open to join a homework. */
export function joinUrlForCode(joinCode: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/join/${joinCode}`;
}

/**
 * Renders the join link as a scannable QR code (PNG data URL) for the admin
 * panel. Deliberately plain black-on-white rather than tinted to the brand
 * color - modules need maximum contrast to scan reliably on phone cameras
 * in imperfect lighting. The on-brand orange treatment is the frame drawn
 * around it wherever it's displayed (see the `qr-frame` class), not the
 * code itself.
 */
export async function generateJoinQrDataUrl(joinCode: string): Promise<string> {
  const url = joinUrlForCode(joinCode);
  return QRCode.toDataURL(url, {
    margin: 2,
    width: 320,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}
