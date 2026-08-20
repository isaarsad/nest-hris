import { UserRole } from '../../users/user-role-permissions.js';

export interface AccessTokenPayload {
  readonly sub: string;
  readonly role: UserRole;
  readonly departmentId: string | null;
}

export abstract class TokenGeneratorPort {
  abstract generate(payload: AccessTokenPayload): Promise<string>;
  abstract verify(token: string): Promise<AccessTokenPayload>;
}
