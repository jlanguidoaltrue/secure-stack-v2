import { authenticator } from "otplib";
import qrcode from "qrcode";
export async function generateTotpSecret(label){
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(label, "SecureBackend", secret);
  const qrDataUrl = await qrcode.toDataURL(otpauth);
  return { base32: secret, otpauth, qrDataUrl };
}
export function verifyTotp(token, secret){
  try{ return authenticator.verify({ token, secret }); }catch{ return false; }
}
export function createBackupCodes(n=8){
  const out = [];
  for(let i=0;i<n;i++) out.push(Math.random().toString(36).slice(2,10).toUpperCase());
  return out;
}
