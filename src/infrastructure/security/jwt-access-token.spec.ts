import { JwtAccessToken } from './jwt-access-token.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { config } from '../config/index.js';
import type { AccessTokenPayload } from '../../domain/auth/ports/access-token.port.js';
import { jwtVerify, SignJWT } from 'jose';
import { TokenInvalidError } from '../../domain/auth/errors/index.js';

describe('JwtAccessToken', () => {
  let jwtAccessToken: JwtAccessToken;

  const mockPayload: AccessTokenPayload = {
    sub: 'user-id-123',
    role: UserRole.EMPLOYEE,
  };

  beforeEach(() => {
    jwtAccessToken = new JwtAccessToken();
  });

  // ===================================================================
  // generate
  // ===================================================================

  describe('generate', () => {
    it('should generate a signed JWT with valid header, claims, and expiration', async () => {
      const token = await jwtAccessToken.generate(mockPayload);

      const [headerB64, payloadB64] = token.split('.');
      const header = JSON.parse(
        Buffer.from(headerB64!, 'base64url').toString(),
      );
      const payload = JSON.parse(
        Buffer.from(payloadB64!, 'base64url').toString(),
      );

      expect(header.alg).toBe('HS256');
      expect(payload.sub).toBe(mockPayload.sub);
      expect(payload.role).toBe(mockPayload.role);
      expect(payload.iat).toBeTypeOf('number');
      expect(payload.exp).toBeTypeOf('number');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should sign the token using the secret from config', async () => {
      const token = await jwtAccessToken.generate(mockPayload);
      const wrongKey = new TextEncoder().encode(
        'wrong-secret-key-32-characters-min',
      );

      await expect(
        jwtVerify(token, wrongKey, { algorithms: ['HS256'] }),
      ).rejects.toThrow();
    });

    it('should correctly encode payload for all defined user roles', async () => {
      for (const role of Object.values(UserRole)) {
        const token = await jwtAccessToken.generate({ sub: 'user-id', role });
        const [, payloadB64] = token.split('.');
        const decoded = JSON.parse(
          Buffer.from(payloadB64!, 'base64url').toString(),
        );

        expect(decoded.role).toBe(role);
      }
    });
  });

  // ===================================================================
  // verify
  // ===================================================================

  describe('verify', () => {
    it('should successfully verify a valid token and return strictly sub and role', async () => {
      const token = await jwtAccessToken.generate(mockPayload);
      const result = await jwtAccessToken.verify(token);

      expect(result).toStrictEqual({
        sub: mockPayload.sub,
        role: mockPayload.role,
      });
    });

    it('should throw TokenInvalidError for an invalid or malformed token string', async () => {
      await expect(
        jwtAccessToken.verify('invalid.token.string'),
      ).rejects.toThrow(TokenInvalidError);
      await expect(jwtAccessToken.verify('')).rejects.toThrow(
        TokenInvalidError,
      );
    });

    it('should throw TokenInvalidError for a token signed with a different secret', async () => {
      const wrongKey = new TextEncoder().encode(
        'wrong-secret-key-32-characters-min',
      );

      const fakeToken = await new SignJWT({ role: UserRole.ADMIN })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('some-user')
        .setIssuedAt()
        .setExpirationTime(config.auth.jwt.expiresIn)
        .sign(wrongKey);

      await expect(jwtAccessToken.verify(fakeToken)).rejects.toThrow(
        TokenInvalidError,
      );
    });

    it('should throw TokenInvalidError when token has expired', async () => {
      const secretKey = new TextEncoder().encode(config.auth.jwt.secret);
      const nowUnix = Math.floor(Date.now() / 1000);

      const expiredToken = await new SignJWT({ role: UserRole.EMPLOYEE })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('user-id-456')
        .setIssuedAt(nowUnix - 7200) // Issued 2 hours ago
        .setExpirationTime(nowUnix - 3600) // Expired 1 hour ago
        .sign(secretKey);

      await expect(jwtAccessToken.verify(expiredToken)).rejects.toThrow(
        TokenInvalidError,
      );
    });

    it('should throw TokenInvalidError when token payload is missing sub', async () => {
      const secretKey = new TextEncoder().encode(config.auth.jwt.secret);

      const tokenWithoutSub = await new SignJWT({ role: UserRole.ADMIN })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(config.auth.jwt.expiresIn)
        .sign(secretKey);

      await expect(jwtAccessToken.verify(tokenWithoutSub)).rejects.toThrow(
        TokenInvalidError,
      );
    });

    it('should throw TokenInvalidError when token payload has an invalid role', async () => {
      const secretKey = new TextEncoder().encode(config.auth.jwt.secret);

      const tokenWithBadRole = await new SignJWT({ role: 'UNKNOWN_ROLE' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('user-id-123')
        .setIssuedAt()
        .setExpirationTime(config.auth.jwt.expiresIn)
        .sign(secretKey);

      await expect(jwtAccessToken.verify(tokenWithBadRole)).rejects.toThrow(
        TokenInvalidError,
      );
    });

    it('should correctly verify tokens for all valid user roles', async () => {
      for (const role of Object.values(UserRole)) {
        const payload: AccessTokenPayload = { sub: `user-${role}`, role };
        const token = await jwtAccessToken.generate(payload);
        const result = await jwtAccessToken.verify(token);

        expect(result).toStrictEqual(payload);
      }
    });
  });
});
