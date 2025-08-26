import dotenv from "dotenv";
dotenv.config();

export const envVars = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/securedb",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  JWT_SECRET: process.env.JWT_SECRET || "change_me",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh_change_me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || "30d",
  MAIL_FROM: process.env.MAIL_FROM || "No Reply <noreply@example.com>",
  SMTP_HOST: process.env.SMTP_HOST || "localhost",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "1025", 10),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "32_character_encryption_key__123456",
  CLIENT_ERROR_EMAIL: process.env.CLIENT_ERROR_EMAIL || "",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/social/google/callback",
  MS_CLIENT_ID: process.env.MS_CLIENT_ID || "",
  MS_CLIENT_SECRET: process.env.MS_CLIENT_SECRET || "",
  MS_CALLBACK_URL: process.env.MS_CALLBACK_URL || "/api/auth/social/microsoft/callback"
};
