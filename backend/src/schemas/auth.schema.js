import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    tenantId: z.string().optional(),
    role: z.enum(["superadmin","tenant_admin","manager","user"]).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    usernameOrEmail: z.string(),
    password: z.string().min(1),
    mfaToken: z.string().optional(),
    backupCode: z.string().optional()
  })
});

export const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(10) })
});
