import { UserRole } from '../../users/user-role-permissions.js';

export interface AccessTokenPayload {
  readonly sub: string;
  readonly role: UserRole;
}

export interface AccessTokenPort {
  generate(payload: AccessTokenPayload): Promise<string>;
  verify(token: string): Promise<AccessTokenPayload>;
}
