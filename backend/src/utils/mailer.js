import nodemailer from "nodemailer";
import { envVars } from "../config/envVars.js";

export const transporter = nodemailer.createTransport({
  host: envVars.SMTP_HOST,
  port: envVars.SMTP_PORT,
  secure: false,
  auth: envVars.SMTP_USER ? { user: envVars.SMTP_USER, pass: envVars.SMTP_PASS } : undefined,
});

export async function sendMail(opt){
  return transporter.sendMail({ from: envVars.MAIL_FROM, ...opt });
}
