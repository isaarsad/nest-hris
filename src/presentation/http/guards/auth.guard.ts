import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { AccessTokenPort } from '../../../domain/auth/ports/access-token.port.js';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';
import { TokenInvalidError } from '../../../domain/auth/errors/index.js';
import { Public } from '../decorators/public.decorator.js';

export const ACCESS_TOKEN_PORT = Symbol('ACCESS_TOKEN_PORT');

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_PORT)
    private readonly accessTokenPort: AccessTokenPort,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride(Public, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new TokenInvalidError();
    }

    const payload = await this.accessTokenPort.verify(token);

    request.user = new RequestingUser(payload.sub, payload.role);

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
