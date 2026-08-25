import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { RefreshTokenResult } from '../../../../application/auth/refresh-token.use-case.js';

export const refreshTokenResponseSchema: z.ZodType<RefreshTokenResult> =
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  });

export class RefreshTokenResponseDto extends createZodDto(
  refreshTokenResponseSchema,
) {}
