import { JwtAccessToken } from '../../src/infrastructure/security/jwt-access-token.js';
import { UserRole } from '../../src/domain/users/user-role-permissions.js';

const jwtAccessToken = new JwtAccessToken();

export async function createAuthHeader(
  userId: string = crypto.randomUUID(),
  role: UserRole = UserRole.ADMIN,
): Promise<{ Authorization: string }> {
  const token = await jwtAccessToken.generate({ sub: userId, role });
  return { Authorization: `Bearer ${token}` };
}
