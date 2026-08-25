import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LoginResult } from '../../../../application/auth/login.use-case.js';
import { UserRole } from '../../../../domain/users/user-role-permissions.js';

export const loginResponseSchema: z.ZodType<LoginResult> = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    username: z.string(),
    role: z.enum(UserRole),
  }),
});

export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
