import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import {
  UserTableTestHelper,
  DEFAULT_RAW_PASSWORD,
} from '../helpers/user-table-test.helper.js';
import { RefreshTokenTableTestHelper } from '../helpers/refresh-token-table-test.helper.js';
import { createAuthHeader } from '../helpers/auth-token-test.helper.js';
import { UserRole } from '../../src/domain/users/user-role-permissions.js';
import { CryptoRefreshToken } from '../../src/infrastructure/security/crypto-refresh-token.js';
import { Server } from 'http';
import { SignJWT } from 'jose';
import { config } from '../../src/infrastructure/config/index.js';

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 60 * 60 * 1000 * 24;

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let dataSource: DataSource;
  let userHelper: UserTableTestHelper;
  let refreshTokenHelper: RefreshTokenTableTestHelper;
  let cryptoRefreshToken: CryptoRefreshToken;

  let rootAuthHeader: Record<string, string>;
  let adminAuthHeader: Record<string, string>;
  let hrAuthHeader: Record<string, string>;
  let employeeAuthHeader: Record<string, string>;
  let authHeaders: Record<UserRole, Record<string, string>>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    server = app.getHttpServer() as Server;

    dataSource = moduleFixture.get<DataSource>(DataSource);
    userHelper = new UserTableTestHelper(dataSource);
    refreshTokenHelper = new RefreshTokenTableTestHelper(dataSource);
    cryptoRefreshToken = new CryptoRefreshToken();

    rootAuthHeader = await createAuthHeader(crypto.randomUUID(), UserRole.ROOT);
    adminAuthHeader = await createAuthHeader(
      crypto.randomUUID(),
      UserRole.ADMIN,
    );
    hrAuthHeader = await createAuthHeader(crypto.randomUUID(), UserRole.HR);
    employeeAuthHeader = await createAuthHeader(
      crypto.randomUUID(),
      UserRole.EMPLOYEE,
    );

    authHeaders = {
      [UserRole.ROOT]: rootAuthHeader,
      [UserRole.ADMIN]: adminAuthHeader,
      [UserRole.HR]: hrAuthHeader,
      [UserRole.EMPLOYEE]: employeeAuthHeader,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await refreshTokenHelper.clear();
    await userHelper.clear();
  });

  // ============================================================
  // POST /auth/login — User Login
  // ============================================================
  describe('POST /auth/login', () => {
    describe('Success cases', () => {
      it('should respond 200 with tokens and user info on valid credentials', async () => {
        const user = await userHelper.insert({
          username: 'johndoe',
          email: 'john@example.com',
          role: UserRole.EMPLOYEE,
          isActive: true,
        });

        const response = await request(server)
          .post('/auth/login')
          .send({
            email: 'john@example.com',
            password: DEFAULT_RAW_PASSWORD,
          })
          .expect(200);

        expect(response.body).toMatchObject({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            id: user.id,
            email: 'john@example.com',
            username: 'johndoe',
            role: UserRole.EMPLOYEE,
          },
        });

        // Verify refresh token stored in database
        const rawRefreshToken = response.body.refreshToken;
        const hash = cryptoRefreshToken.hash(rawRefreshToken);

        const tokenRecord = await refreshTokenHelper.findByTokenHash(hash);
        expect(tokenRecord).toStrictEqual({
          id: expect.any(String),
          userId: user.id,
          tokenHash: hash,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        });
      });
    });

    describe('Payload validation', () => {
      it.each([
        {
          scenario: 'email is missing',
          payload: { password: DEFAULT_RAW_PASSWORD },
          expectedError: { field: 'email', code: 'invalid_type' },
        },
        {
          scenario: 'email format is invalid',
          payload: { email: 'not-an-email', password: DEFAULT_RAW_PASSWORD },
          expectedError: {
            field: 'email',
            code: 'invalid_format',
          },
        },
        {
          scenario: 'email exceeds 254 characters',
          payload: {
            email: `${'a'.repeat(246)}@test.com`, // 255 chars
            password: DEFAULT_RAW_PASSWORD,
          },
          expectedError: {
            field: 'email',
            code: 'too_big',
          },
        },
        {
          scenario: 'password is missing',
          payload: { email: 'user@example.com' },
          expectedError: { field: 'password', code: 'invalid_type' },
        },
        {
          scenario: 'password is empty string',
          payload: { email: 'user@example.com', password: '' },
          expectedError: {
            field: 'password',
            code: 'too_small',
          },
        },
        {
          scenario: 'password exceeds 100 characters',
          payload: {
            email: 'user@example.com',
            password: 'a'.repeat(101),
          },
          expectedError: {
            field: 'password',
            code: 'too_big',
          },
        },
      ])(
        'should return 400 when $scenario',
        async ({ payload, expectedError }) => {
          const response = await request(server)
            .post('/auth/login')
            .send(payload)
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            message: expect.any(String),
            path: '/auth/login',
            timestamp: expect.any(String),
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expectedError.field,
                code: expectedError.code,
                message: expect.any(String),
              }),
            ]),
          });
        },
      );
    });

    describe('Business rule errors', () => {
      it('should return 401 INVALID_CREDENTIALS when password is wrong', async () => {
        await userHelper.insert({
          username: 'johndoe',
          email: 'john@example.com',
          isActive: true,
        });

        const response = await request(server)
          .post('/auth/login')
          .send({
            email: 'john@example.com',
            password: 'WrongPassword123',
          })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'INVALID_CREDENTIALS',
          message: expect.any(String),
          path: '/auth/login',
          timestamp: expect.any(String),
        });
      });

      it('should return 401 INVALID_CREDENTIALS when email is not found', async () => {
        const response = await request(server)
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: DEFAULT_RAW_PASSWORD,
          })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'INVALID_CREDENTIALS',
          message: expect.any(String),
          path: '/auth/login',
          timestamp: expect.any(String),
        });
      });

      it('should return 403 USER_INACTIVE when user is inactive', async () => {
        await userHelper.insert({
          email: 'inactive@example.com',
          isActive: false,
        });

        const response = await request(server)
          .post('/auth/login')
          .send({
            email: 'inactive@example.com',
            password: DEFAULT_RAW_PASSWORD,
          })
          .expect(403);

        expect(response.body).toMatchObject({
          statusCode: 403,
          error: 'USER_INACTIVE',
          message: expect.stringMatching(/inactive/i),
          path: '/auth/login',
          timestamp: expect.any(String),
        });
      });
    });
  });

  // ============================================================
  // POST /auth/refresh — Refresh Access & Refresh Tokens
  // ============================================================
  describe('POST /auth/refresh', () => {
    describe('Success cases', () => {
      it('should respond 200 with new token pair and rotate old refresh token', async () => {
        const user = await userHelper.insert({
          username: 'active_refresher',
          email: 'refresher@example.com',
          isActive: true,
        });

        const plainToken = cryptoRefreshToken.generate();
        const tokenHash = cryptoRefreshToken.hash(plainToken);

        const oldTokenRecord = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash,
        });

        const response = await request(server)
          .post('/auth/refresh')
          .send({ refreshToken: plainToken })
          .expect(200);

        expect(response.body).toMatchObject({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });

        // Verify rotation in DB
        const newHash = cryptoRefreshToken.hash(response.body.refreshToken);
        const newRaw = await refreshTokenHelper.findByTokenHash(newHash);
        expect(newRaw).toStrictEqual({
          id: expect.any(String),
          userId: user.id,
          tokenHash: newHash,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        });

        const oldRaw = await refreshTokenHelper.findByIdRaw(oldTokenRecord.id);
        expect(oldRaw).toStrictEqual({
          id: oldTokenRecord.id,
          userId: user.id,
          tokenHash: tokenHash,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: expect.any(Date),
          replacedByTokenId: newRaw!.id,
          createdAt: expect.any(Date),
        });
      });
    });

    describe('Payload validation', () => {
      it.each([
        {
          scenario: 'refreshToken is missing',
          payload: {},
          expectedError: {
            field: 'refreshToken',
            code: 'invalid_type',
          },
        },
        {
          scenario: 'refreshToken is not a string (e.g. number)',
          payload: { refreshToken: 1234567890 },
          expectedError: {
            field: 'refreshToken',
            code: 'invalid_type',
          },
        },
        {
          scenario: 'refreshToken is empty string',
          payload: { refreshToken: '' },
          expectedError: {
            field: 'refreshToken',
            code: 'too_small',
          },
        },
        {
          scenario: 'refreshToken is less than 64 characters (63 hex chars)',
          payload: { refreshToken: 'a'.repeat(63) },
          expectedError: {
            field: 'refreshToken',
            code: 'invalid_format',
          },
        },
        {
          scenario: 'refreshToken exceeds 64 characters (65 hex chars)',
          payload: { refreshToken: 'a'.repeat(65) },
          expectedError: {
            field: 'refreshToken',
            code: 'invalid_format',
          },
        },
        {
          scenario: 'refreshToken contains non-hexadecimal characters',
          payload: { refreshToken: 'z'.repeat(64) },
          expectedError: {
            field: 'refreshToken',
            code: 'invalid_format',
          },
        },
      ])(
        'should return 400 when $scenario',
        async ({ payload, expectedError }) => {
          const response = await request(server)
            .post('/auth/refresh')
            .send(payload)
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            message: expect.any(String),
            path: '/auth/refresh',
            timestamp: expect.any(String),
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expectedError.field,
                code: expectedError.code,
                message: expect.any(String),
              }),
            ]),
          });
        },
      );
    });

    describe('Business rule errors', () => {
      it('should return 401 TOKEN_INVALID when refresh token does not exist', async () => {
        const fakeToken = cryptoRefreshToken.generate();

        const response = await request(server)
          .post('/auth/refresh')
          .send({ refreshToken: fakeToken })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_INVALID',
          message: expect.any(String),
          path: '/auth/refresh',
          timestamp: expect.any(String),
        });
      });

      it('should return 401 TOKEN_EXPIRED when refresh token is expired', async () => {
        const user = await userHelper.insert({ isActive: true });
        const plainToken = cryptoRefreshToken.generate();
        const tokenHash = cryptoRefreshToken.hash(plainToken);

        const now = Date.now();
        await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash,
          createdAt: new Date(now - ONE_HOUR * 2), // 2 hours ago
          expiresAt: new Date(now - ONE_HOUR), // Expired 1 hour ago
          absoluteExpiresAt: new Date(now + ONE_DAY),
        });

        const response = await request(server)
          .post('/auth/refresh')
          .send({ refreshToken: plainToken })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_EXPIRED',
          message: expect.any(String),
          path: '/auth/refresh',
          timestamp: expect.any(String),
        });
      });

      it('should revoke ALL tokens and return 401 when a revoked token is reused (Reuse Detection)', async () => {
        const user = await userHelper.insert({ isActive: true });

        // Stale revoked token (Token A)
        const plainTokenA = cryptoRefreshToken.generate();
        const tokenHashA = cryptoRefreshToken.hash(plainTokenA);
        await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash: tokenHashA,
          createdAt: new Date(Date.now() - ONE_HOUR * 2), // Created 2 hour ago
          revokedAt: new Date(Date.now() - ONE_HOUR), // Revoked 1 hour ago
          expiresAt: new Date(Date.now() + ONE_DAY),
        });

        // Legitimate active session token (Token B)
        const plainTokenB = cryptoRefreshToken.generate();
        const tokenHashB = cryptoRefreshToken.hash(plainTokenB);
        const activeToken = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash: tokenHashB,
          revokedAt: null, // Still active
          expiresAt: new Date(Date.now() + ONE_DAY),
        });

        // Attacker or client attempts to refresh using the revoked Token A
        const response = await request(server)
          .post('/auth/refresh')
          .send({ refreshToken: plainTokenA })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_INVALID',
          message: expect.any(String),
          path: '/auth/refresh',
          timestamp: expect.any(String),
        });

        // Database assertion: Active Token B must be revoked as part of token family invalidation
        const rawTokenB = await refreshTokenHelper.findByIdRaw(activeToken.id);
        expect(rawTokenB!.revokedAt).not.toBeNull();
      });

      it('should return 403 USER_INACTIVE when user is deactivated', async () => {
        const user = await userHelper.insert({ isActive: false });
        const plainToken = cryptoRefreshToken.generate();
        const tokenHash = cryptoRefreshToken.hash(plainToken);

        await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash,
        });

        const response = await request(server)
          .post('/auth/refresh')
          .send({ refreshToken: plainToken })
          .expect(403);

        expect(response.body).toMatchObject({
          statusCode: 403,
          error: 'USER_INACTIVE',
          message: expect.any(String),
          path: '/auth/refresh',
          timestamp: expect.any(String),
        });
      });
    });

    describe('Concurrency & Race condition', () => {
      it('should allow only ONE request to rotate and reject the concurrent request when refreshed simultaneously', async () => {
        const user = await userHelper.insert({
          username: 'concurrency_refresher',
          email: 'concurrent@example.com',
          isActive: true,
        });

        const plainToken = cryptoRefreshToken.generate();
        const tokenHash = cryptoRefreshToken.hash(plainToken);

        const oldTokenRecord = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash,
        });

        // Dispatch two HTTP refresh requests simultaneously with the same refresh token
        const [res1, res2] = await Promise.all([
          request(server)
            .post('/auth/refresh')
            .send({ refreshToken: plainToken }),
          request(server)
            .post('/auth/refresh')
            .send({ refreshToken: plainToken }),
        ]);

        const responses = [res1, res2];
        const successRes = responses.find((r) => r.status === 200);
        const failedRes = responses.find((r) => r.status === 401);

        // 1. Verify HTTP Status Contracts: Exactly one winner and one rejected
        expect(successRes).toBeDefined();
        expect(failedRes).toBeDefined();

        // 2. Verify Success Response Contract
        expect(successRes!.body).toMatchObject({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });

        // 3. Verify Error Response Contract for the losing request
        expect(failedRes!.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_INVALID',
          message: expect.any(String),
          path: '/auth/refresh',
          timestamp: expect.any(String),
        });

        // 4. Verify Database Integrity: Old token must be revoked and linked to the winner's new token
        const rawOld = await refreshTokenHelper.findByIdRaw(oldTokenRecord.id);
        expect(rawOld).not.toBeNull();
        expect(rawOld!.revokedAt).not.toBeNull();
        expect(rawOld!.replacedByTokenId).toBeDefined();

        // 5. Verify Database Integrity: Exactly ONE active new token exists in DB
        const winnerNewHash = cryptoRefreshToken.hash(
          successRes!.body.refreshToken,
        );
        const winnerRaw =
          await refreshTokenHelper.findByTokenHash(winnerNewHash);

        expect(winnerRaw).not.toBeNull();
        expect(winnerRaw!.id).toBe(rawOld!.replacedByTokenId);
        expect(winnerRaw!.userId).toBe(user.id);
        expect(winnerRaw!.revokedAt).toBeNull();
      });
    });
  });

  // ============================================================
  // POST /auth/logout — User Logout
  // ============================================================
  describe('POST /auth/logout', () => {
    describe('Success cases', () => {
      it('should respond 204 and revoke the refresh token', async () => {
        const user = await userHelper.insert({ isActive: true });
        const plainToken = cryptoRefreshToken.generate();
        const tokenHash = cryptoRefreshToken.hash(plainToken);

        const record = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash,
        });

        await request(server)
          .post('/auth/logout')
          .send({ refreshToken: plainToken })
          .expect(204);

        const raw = await refreshTokenHelper.findByIdRaw(record.id);
        expect(raw).toStrictEqual({
          id: expect.any(String),
          userId: user.id,
          tokenHash,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: expect.any(Date),
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        });
      });

      it('should respond 204 idempotently when refresh token is already revoked', async () => {
        const user = await userHelper.insert({ isActive: true });
        const plainToken = cryptoRefreshToken.generate();
        const tokenHash = cryptoRefreshToken.hash(plainToken);

        const createdAt = new Date(Date.now() - ONE_HOUR * 2);
        const originalRevokedAt = new Date(Date.now() - ONE_HOUR);
        const record = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash,
          createdAt,
          revokedAt: originalRevokedAt, // Already logged out / revoked
        });

        await request(server)
          .post('/auth/logout')
          .send({ refreshToken: plainToken })
          .expect(204);

        // Database assertion: ensure revokedAt is NOT mutated
        const raw = await refreshTokenHelper.findByIdRaw(record.id);
        expect(raw!.revokedAt).toEqual(originalRevokedAt);
      });

      it('should respond 204 idempotently even if refresh token does not exist', async () => {
        const fakeToken = cryptoRefreshToken.generate();

        const response = await request(server)
          .post('/auth/logout')
          .send({ refreshToken: fakeToken })
          .expect(204);

        expect(response.body).toEqual({});
      });
    });

    describe('Payload validation', () => {
      it('should return 400 when refreshToken is missing', async () => {
        const response = await request(server)
          .post('/auth/logout')
          .send({})
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          path: '/auth/logout',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'refreshToken' }),
          ]),
        });
      });
    });
  });

  // ============================================================
  // DELETE /auth/:id/sessions — Revoke User Sessions
  // ============================================================
  describe('DELETE /auth/:id/sessions', () => {
    describe('Success cases', () => {
      it('should ALLOW Admin to revoke all active sessions for a target user', async () => {
        const user = await userHelper.insert({
          role: UserRole.EMPLOYEE,
          isActive: true,
        });

        const hash1 = 'hash1' + '0'.repeat(59);
        const hash2 = 'hash2' + '0'.repeat(59);

        const token1 = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash: hash1,
          revokedAt: null,
        });
        const token2 = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash: hash2,
          revokedAt: null,
        });

        await request(server)
          .delete(`/auth/${user.id}/sessions`)
          .set(adminAuthHeader)
          .expect(204);

        const raw1 = await refreshTokenHelper.findByIdRaw(token1.id);
        const raw2 = await refreshTokenHelper.findByIdRaw(token2.id);
        expect(raw1).toStrictEqual({
          id: expect.any(String),
          userId: user.id,
          tokenHash: hash1,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: expect.any(Date),
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        });
        expect(raw2).toStrictEqual({
          id: expect.any(String),
          userId: user.id,
          tokenHash: hash2,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: expect.any(Date),
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        });
      });

      it('should ALLOW a user to revoke their own sessions (self revocation)', async () => {
        const user = await userHelper.insert({
          role: UserRole.EMPLOYEE,
          isActive: true,
        });

        const hash1 = 'hash1' + '0'.repeat(59);
        const hash2 = 'hash2' + '0'.repeat(59);

        const token1 = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash: hash1,
          revokedAt: null,
        });
        const token2 = await refreshTokenHelper.insert({
          userId: user.id,
          tokenHash: hash2,
          revokedAt: null,
        });

        const selfHeader = await createAuthHeader(user.id, UserRole.EMPLOYEE);

        await request(server)
          .delete(`/auth/${user.id}/sessions`)
          .set(selfHeader)
          .expect(204);

        const raw1 = await refreshTokenHelper.findByIdRaw(token1.id);
        const raw2 = await refreshTokenHelper.findByIdRaw(token2.id);
        expect(raw1).toStrictEqual({
          id: expect.any(String),
          userId: user.id,
          tokenHash: hash1,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: expect.any(Date),
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        });
        expect(raw2).toStrictEqual({
          id: expect.any(String),
          userId: user.id,
          tokenHash: hash2,
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
          revokedAt: expect.any(Date),
          replacedByTokenId: null,
          createdAt: expect.any(Date),
        });
      });
    });

    describe('Role Permission & Hierarchy Rules', () => {
      describe('Allowed Role Hierarchy Revocation', () => {
        it.each([
          {
            revokerRole: UserRole.ROOT,
            targetRole: UserRole.ROOT,
          },
          {
            revokerRole: UserRole.ROOT,
            targetRole: UserRole.ADMIN,
          },
          {
            revokerRole: UserRole.ROOT,
            targetRole: UserRole.HR,
          },
          {
            revokerRole: UserRole.ROOT,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            revokerRole: UserRole.ADMIN,
            targetRole: UserRole.HR,
          },
          {
            revokerRole: UserRole.ADMIN,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            revokerRole: UserRole.HR,
            targetRole: UserRole.EMPLOYEE,
          },
        ])(
          'should ALLOW $revokerRole to revoke sessions of $targetRole',
          async ({ revokerRole, targetRole }) => {
            const targetUser = await userHelper.insert({
              role: targetRole,
              isActive: true,
            });

            const hash = 'hash-' + crypto.randomUUID().replace(/-/g, '');
            const token = await refreshTokenHelper.insert({
              userId: targetUser.id,
              tokenHash: hash.slice(0, 64),
              revokedAt: null,
            });

            await request(server)
              .delete(`/auth/${targetUser.id}/sessions`)
              .set(authHeaders[revokerRole])
              .expect(204);

            const raw = await refreshTokenHelper.findByIdRaw(token.id);
            expect(raw).toStrictEqual({
              id: token.id,
              userId: targetUser.id,
              tokenHash: hash.slice(0, 64),
              expiresAt: expect.any(Date),
              absoluteExpiresAt: expect.any(Date),
              revokedAt: expect.any(Date),
              replacedByTokenId: null,
              createdAt: expect.any(Date),
            });
          },
        );
      });

      describe('Forbidden Permission & Hierarchy Revocation', () => {
        it.each([
          { targetRole: UserRole.ROOT },
          { targetRole: UserRole.ADMIN },
          { targetRole: UserRole.HR },
          { targetRole: UserRole.EMPLOYEE },
        ])(
          'should FORBID EMPLOYEE from revoking sessions of $targetRole (Permission Denied)',
          async ({ targetRole }) => {
            const targetUser = await userHelper.insert({
              role: targetRole,
              isActive: true,
            });

            const response = await request(server)
              .delete(`/auth/${targetUser.id}/sessions`)
              .set(employeeAuthHeader)
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_PERMISSION_DENIED',
              message: expect.any(String),
              path: `/auth/${targetUser.id}/sessions`,
              timestamp: expect.any(String),
            });
          },
        );

        it.each([
          {
            revokerRole: UserRole.ADMIN,
            targetRole: UserRole.ROOT,
          },
          {
            revokerRole: UserRole.ADMIN,
            targetRole: UserRole.ADMIN,
          },
          {
            revokerRole: UserRole.HR,
            targetRole: UserRole.ROOT,
          },
          {
            revokerRole: UserRole.HR,
            targetRole: UserRole.ADMIN,
          },
          {
            revokerRole: UserRole.HR,
            targetRole: UserRole.HR,
          },
        ])(
          'should FORBID $revokerRole from revoking sessions of $targetRole (Hierarchy Violation)',
          async ({ revokerRole, targetRole }) => {
            const targetUser = await userHelper.insert({
              role: targetRole,
              isActive: true,
            });

            const response = await request(server)
              .delete(`/auth/${targetUser.id}/sessions`)
              .set(authHeaders[revokerRole])
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_HIERARCHY_VIOLATION',
              message: expect.any(String),
              path: `/auth/${targetUser.id}/sessions`,
              timestamp: expect.any(String),
            });
          },
        );
      });
    });

    describe('Error cases', () => {
      it('should return 404 when target user is not found', async () => {
        const nonExistentId = crypto.randomUUID();

        const response = await request(server)
          .delete(`/auth/${nonExistentId}/sessions`)
          .set(rootAuthHeader)
          .expect(404);

        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'USER_NOT_FOUND',
          message: expect.any(String),
          path: `/auth/${nonExistentId}/sessions`,
          timestamp: expect.any(String),
        });
      });

      it('should return 400 when id is not a valid UUID', async () => {
        const response = await request(server)
          .delete('/auth/invalid-uuid/sessions')
          .set(rootAuthHeader)
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          error: expect.any(String),
          message: expect.any(String),
          path: '/auth/invalid-uuid/sessions',
          timestamp: expect.any(String),
        });
      });
    });
  });

  describe('Authentication (AuthGuard)', () => {
    it('should return 401 TOKEN_INVALID when Authorization header is missing', async () => {
      const response = await request(server)
        .delete(`/auth/${crypto.randomUUID()}/sessions`)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'TOKEN_INVALID',
        message: expect.any(String),
        path: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return 401 TOKEN_INVALID when Authorization scheme is not Bearer', async () => {
      const response = await request(server)
        .delete(`/auth/${crypto.randomUUID()}/sessions`)
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'TOKEN_INVALID',
        message: expect.any(String),
        path: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return 401 TOKEN_INVALID when Bearer token is empty', async () => {
      const response = await request(server)
        .delete(`/auth/${crypto.randomUUID()}/sessions`)
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'TOKEN_INVALID',
        message: expect.any(String),
        path: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return 401 TOKEN_INVALID when token is malformed or invalid', async () => {
      const response = await request(server)
        .delete(`/auth/${crypto.randomUUID()}/sessions`)
        .set('Authorization', 'Bearer invalid.token.payload.string')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'TOKEN_INVALID',
        message: expect.any(String),
        path: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return 401 TOKEN_INVALID when access token is expired', async () => {
      const now = Date.now();
      const issuedAt = Math.floor((now - ONE_HOUR * 2) / 1000);
      const expiredAt = Math.floor((now - ONE_HOUR) / 1000);

      const expiredToken = await new SignJWT({ role: UserRole.EMPLOYEE })
        .setSubject(crypto.randomUUID())
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(issuedAt)
        .setExpirationTime(expiredAt)
        .sign(new TextEncoder().encode(config.auth.jwt.secret));

      const response = await request(server)
        .delete(`/auth/${crypto.randomUUID()}/sessions`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'TOKEN_INVALID',
        message: expect.any(String),
        path: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});
