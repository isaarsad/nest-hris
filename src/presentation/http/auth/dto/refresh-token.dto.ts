import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { RefreshTokenCommand } from '../../../../application/auth/refresh-token.use-case.js';

export const refreshTokenSchema: z.ZodType<RefreshTokenCommand> = z.object({
  refreshToken: z
    .string({
      message: 'Refresh token must be a text string',
    })
    .trim()
    .nonempty('Refresh token is required')
    .regex(
      /^[a-f0-9]{64}$/i,
      'Refresh token must be a 64-character hexadecimal string',
    ),
});

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
