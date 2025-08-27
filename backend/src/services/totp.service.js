import { authenticator } from "otplib";
import qrcode from "qrcode";
import crypto from "crypto";

// TOTP defaults: 30s step, 6 digits, SHA1 (compat with most apps)
authenticator.options = { step: 30, digits: 6, window: 1 };

export async function generateTotpSecret({
  accountName,
  issuer = process.env.APP_NAME || "SecureBackend",
}) {
  if (!accountName) throw new Error("accountName is required");

  const base32 = authenticator.generateSecret(); // base32 string
  const otpauth = authenticator.keyuri(accountName, issuer, base32);
  const qrDataUrl = await qrcode.toDataURL(otpauth);

  // Return a consistent shape that the FE can use as secret.base32
  return { secret: { base32 }, otpauth, qrDataUrl };
}

export function verifyTotp(token, base32Secret) {
  try {
    return authenticator.verify({ token, secret: base32Secret });
  } catch {
    return false;
  }
}

export function createBackupCodes(n = 8) {
  return Array.from({ length: n }, () => {
    // 10 hex chars (~40 bits), segment for readability
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}
