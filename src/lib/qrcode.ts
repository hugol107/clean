import "server-only";
import QRCode from "qrcode";

/** PNG data URL — handy for <img src> previews and printable labels. */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}

/** Inline SVG markup — crisp at any print size. */
export async function generateQrCodeSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}

export function buildTagUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/t/${token}`;
}
