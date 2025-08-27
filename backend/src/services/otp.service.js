// services/otp.service.js
import crypto from "crypto";
import User from "../models/User.js";
import { sendMail } from "../utils/mailer.js";

const OTP_TTL_SEC = 5 * 60;
const MAX_ATTEMPTS = 5;

const normalizeOtp = (input) =>
  String(input ?? "")
    .replace(/\D/g, "") // digits only
    .padStart(6, "0") // preserve leading zeros
    .slice(-6); // keep last 6

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

export async function createAndSendOtp({ user, method = "email" }) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const hash = sha256(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SEC * 1000);

  user.mfaOtp = { hash, method, expiresAt, attempts: 0 };
  user.markModified("mfaOtp");
  await user.save();

  if (method.toLowerCase() === "email") {
    await sendMail({
      to: user.email,
      subject: "Your login code",
      text: `Your code is ${code} (valid for ${OTP_TTL_SEC / 60} minutes).`,
      html: `<p>Your code is <b>${code}</b> (valid for ${
        OTP_TTL_SEC / 60
      } minutes).</p>`,
    });
  } else if (method.toLowerCase() === "sms") {
    if (!user.phone) throw new Error("Phone number not set");
    // Replace with SMS provider in real use
    console.log("[TEST SMS] to:", user.phone, "code:", code);
  } else {
    throw new Error("Unsupported OTP method");
  }
}

export async function verifyUserOtp(userId, codeRaw, { consume = true } = {}) {
  const user = await User.findById(userId);
  const rec = user?.mfaOtp;
  if (!rec) return false;

  // attempts limit
  if ((rec.attempts ?? 0) >= MAX_ATTEMPTS) return false;

  // expiry
  if (!rec.expiresAt || new Date(rec.expiresAt).getTime() < Date.now()) {
    return false;
  }

  const incoming = sha256(normalizeOtp(codeRaw));
  const ok = incoming === rec.hash;

  if (ok) {
    if (consume) user.mfaOtp = undefined; // clear on success
  } else {
    user.mfaOtp.attempts = (rec.attempts ?? 0) + 1; // count failed try
  }

  await user.save();
  return ok;
}
