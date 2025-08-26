import { z } from "zod";
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    username: z.string().min(3),
    password: z.string().min(8).optional(),
    role: z.enum(["superadmin","tenant_admin","manager","user"]).optional()
  })
});
export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    username: z.string().min(3).optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["superadmin","tenant_admin","manager","user"]).optional(),
    isActive: z.boolean().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    bio: z.string().optional(),
    avatarUrl: z.string().optional()
  }),
  params: z.object({ id: z.string() })
});
