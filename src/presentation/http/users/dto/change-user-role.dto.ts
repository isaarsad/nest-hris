import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { UserRole } from '../../../../domain/users/user-role-permissions.js';

export const changeUserRoleSchema = z.object({
  role: z.enum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  }),
});

export class ChangeUserRoleDto extends createZodDto(changeUserRoleSchema) {}
