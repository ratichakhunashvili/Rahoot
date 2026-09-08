import QRCode from "qrcode";

/** Builds the public URL students scan / open to join a homework. */
export function joinUrlForCode(joinCode: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/join/${joinCode}`;
}

/**
 * Renders the join link as a scannable QR code (PNG data URL) for the admin
 * panel. Modules are the darker orange shade (not the brighter brand
 * orange) on a plain white background - orange-on-white still keeps
 * contrast high enough to scan reliably, which a fully orange-on-black
 * treatment would not.
 */
export async function generateJoinQrDataUrl(joinCode: string): Promise<string> {
  const url = joinUrlForCode(joinCode);
  return QRCode.toDataURL(url, {
    margin: 2,
    width: 320,
    color: {
      dark: "#EA580C",
      light: "#FFFFFF",
    },
  });
}
