import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LoginCommand } from '../../../../application/auth/login.use-case.js';

export const loginSchema: z.ZodType<LoginCommand> = z.object({
  email: z
    .email({ message: 'Invalid email address format' })
    .max(254, 'Email cannot exceed 254 characters'),
  password: z
    .string({
      message: 'Password must be a text string',
    })
    .nonempty('Password is required')
    .max(100, 'Password cannot exceed 100 characters'),
});

export class LoginDto extends createZodDto(loginSchema) {}
