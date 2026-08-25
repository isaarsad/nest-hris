import { Injectable } from '@nestjs/common';
import { SignJWT, errors, jwtVerify } from 'jose';
import {
  AccessTokenPort,
  AccessTokenPayload,
} from '../../domain/auth/ports/access-token.port.js';
import { config } from '../config/index.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { TokenInvalidError } from '../../domain/auth/errors/index.js';

@Injectable()
export class JwtAccessToken implements AccessTokenPort {
  private readonly secretKey = new TextEncoder().encode(config.auth.jwt.secret);

  async generate(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(config.auth.jwt.expiresIn)
      .sign(this.secretKey);
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    let payload;
    try {
      const result = await jwtVerify(token, this.secretKey, {
        algorithms: ['HS256'],
      });
      payload = result.payload;
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        throw new TokenInvalidError();
      }
      throw error;
    }

    const validRoles = Object.values(UserRole);
    if (
      !payload.sub ||
      typeof payload.sub !== 'string' ||
      !validRoles.includes(payload.role as UserRole)
    ) {
      throw new TokenInvalidError();
    }

    return {
      sub: payload.sub,
      role: payload.role as UserRole,
    };
  }
}
