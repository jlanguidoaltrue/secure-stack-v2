import nodemailer from "nodemailer";
import { envVars } from "../config/envVars.js";

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: envVars.SMTP_USER,
    pass: envVars.SMTP_PASS
  },
});

export async function sendMail(opt){
  try {
    const info = await transporter.sendMail({ from: envVars.MAIL_FROM, ...opt });
    console.log('Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('Mailer error:', error);
    throw error;
  }
}
