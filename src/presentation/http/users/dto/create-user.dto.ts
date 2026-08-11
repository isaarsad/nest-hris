import { z } from 'zod';
import { CreateUserCommand } from '../../../../application/users/create-user.use-case.js';
import { UserRole } from '../../../../domain/users/user-role-permissions.js';
import { createZodDto } from 'nestjs-zod';

export const createUserSchema: z.ZodType<CreateUserCommand> = z.object({
  username: z
    .string({
      message: 'Username is required and must be a text string',
    })
    .trim()
    .min(5, 'Username must be at least 5 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username may only contain letters, numbers, underscores, or hyphens',
    ),
  email: z
    .email({
      message: 'Invalid email address format',
    })
    .max(254, 'Email cannot exceed 254 characters'),
  passwordPlainText: z
    .string({
      message: 'Password is required and must be a text string',
    })
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  role: z.enum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  }),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
