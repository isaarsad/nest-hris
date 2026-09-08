import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { UserTableTestHelper } from '../helpers/user-table-test.helper.js';
import { UserRole } from '../../src/domain/users/user-role-permissions.js';
import { createAuthHeader } from '../helpers/auth-token-test.helper.js';
import { Server } from 'http';

describe('Users (E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let dataSource: DataSource;
  let userHelper: UserTableTestHelper;
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

    authHeaders = {
      [UserRole.ROOT]: await createAuthHeader(
        crypto.randomUUID(),
        UserRole.ROOT,
      ),
      [UserRole.ADMIN]: await createAuthHeader(
        crypto.randomUUID(),
        UserRole.ADMIN,
      ),
      [UserRole.HR]: await createAuthHeader(crypto.randomUUID(), UserRole.HR),
      [UserRole.EMPLOYEE]: await createAuthHeader(
        crypto.randomUUID(),
        UserRole.EMPLOYEE,
      ),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await userHelper.clear();
  });

  // ============================================================
  // Sanity Check: Module-Level Auth Guard
  // ============================================================
  describe('Authentication Guard (401 Unauthorized)', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(server).get('/users').expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'TOKEN_INVALID',
        message: expect.any(String),
        path: '/users',
        timestamp: expect.any(String),
      });
    });

    it('should return 401 when token is malformed or invalid', async () => {
      const response = await request(server)
        .get('/users')
        .set({ Authorization: 'Bearer random-garbage-jwt' })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'TOKEN_INVALID',
        message: expect.any(String),
        path: '/users',
        timestamp: expect.any(String),
      });
    });
  });

  // ============================================================
  // POST /users — Create User
  // ============================================================
  describe('POST /users', () => {
    describe('Success cases', () => {
      it('should respond 201 and return the created user on valid payload', async () => {
        const payload = {
          username: 'johndoe',
          email: 'johndoe@example.com',
          password: 'SecurePass123',
          role: UserRole.EMPLOYEE,
        };

        const response = await request(server)
          .post('/users')
          .set(authHeaders[UserRole.ROOT])
          .send(payload)
          .expect(201);

        expect(response.body).not.toHaveProperty('passwordHash');
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).toEqual({
          id: expect.any(String),
          username: 'johndoe',
          email: 'johndoe@example.com',
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });

        const createdId = response.body.id;
        const raw = await userHelper.findByIdRaw(createdId);
        expect(raw).toStrictEqual({
          id: createdId,
          username: 'johndoe',
          email: 'johndoe@example.com',
          passwordHash: expect.any(String),
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          deletedAt: null,
        });
      });
    });

    describe('Role Permission & Hierarchy Rules', () => {
      describe('Allowed Role Hierarchy Creation', () => {
        it.each([
          {
            creatorRole: UserRole.ROOT,
            targetRole: UserRole.ROOT,
          },
          {
            creatorRole: UserRole.ROOT,
            targetRole: UserRole.ADMIN,
          },
          {
            creatorRole: UserRole.ROOT,
            targetRole: UserRole.HR,
          },
          {
            creatorRole: UserRole.ROOT,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            creatorRole: UserRole.ADMIN,
            targetRole: UserRole.HR,
          },
          {
            creatorRole: UserRole.ADMIN,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            creatorRole: UserRole.HR,
            targetRole: UserRole.EMPLOYEE,
          },
        ])(
          'should ALLOW $creatorRole to create a user with role $targetRole',
          async ({ creatorRole, targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const payload = {
              username: `user-${uniqueId}`,
              email: `user-${uniqueId}@example.com`,
              password: 'SecurePass123',
              role: targetRole,
            };

            const response = await request(server)
              .post('/users')
              .set(authHeaders[creatorRole])
              .send(payload)
              .expect(201);

            expect(response.body).not.toHaveProperty('passwordHash');
            expect(response.body).not.toHaveProperty('password');
            expect(response.body).toMatchObject({
              id: expect.any(String),
              username: payload.username,
              email: payload.email,
              role: targetRole,
              isActive: true,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            });

            const raw = await userHelper.findByUsernameRaw(payload.username);
            expect(raw).toMatchObject({
              id: expect.any(String),
              username: payload.username,
              email: payload.email,
              role: targetRole,
            });
          },
        );
      });

      describe('Forbidden Role Hierarchy & Permission Creation', () => {
        it.each([
          { targetRole: UserRole.ADMIN },
          { targetRole: UserRole.HR },
          { targetRole: UserRole.ROOT },
          { targetRole: UserRole.EMPLOYEE },
        ])(
          'should FORBID EMPLOYEE from creating user with role $targetRole (Permission Denied)',
          async ({ targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const payload = {
              username: `forbidden_${uniqueId}`,
              email: `forbidden_${uniqueId}@example.com`,
              password: 'SecurePass123',
              role: targetRole,
            };

            const response = await request(server)
              .post('/users')
              .set(authHeaders[UserRole.EMPLOYEE])
              .send(payload)
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_PERMISSION_DENIED',
              message: expect.any(String),
              path: '/users',
              timestamp: expect.any(String),
            });

            const raw = await userHelper.findByUsernameRaw(payload.username);
            expect(raw).toBeNull();
          },
        );

        it.each([
          {
            creatorRole: UserRole.HR,
            targetRole: UserRole.ROOT,
          },
          {
            creatorRole: UserRole.HR,
            targetRole: UserRole.ADMIN,
          },
          {
            creatorRole: UserRole.HR,
            targetRole: UserRole.HR,
          },
          {
            creatorRole: UserRole.ADMIN,
            targetRole: UserRole.ROOT,
          },
          {
            creatorRole: UserRole.ADMIN,
            targetRole: UserRole.ADMIN,
          },
        ])(
          'should FORBID $creatorRole from creating a user with role $targetRole (Hierarchy Violation)',
          async ({ creatorRole, targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const payload = {
              username: `forbidden_${uniqueId}`,
              email: `forbidden_${uniqueId}@example.com`,
              password: 'SecurePass123',
              role: targetRole,
            };

            const response = await request(server)
              .post('/users')
              .set(authHeaders[creatorRole])
              .send(payload)
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_HIERARCHY_VIOLATION',
              message: expect.any(String),
              path: '/users',
              timestamp: expect.any(String),
            });
            const raw = await userHelper.findByUsernameRaw(payload.username);
            expect(raw).toBeNull();
          },
        );
      });
    });

    describe('Payload validation', () => {
      it.each([
        {
          scenario: 'username is missing',
          payload: {
            email: 'test@example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'username', code: 'invalid_type' },
        },
        {
          scenario: 'email is missing',
          payload: {
            username: 'testuser',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'email', code: 'invalid_type' },
        },
        {
          scenario: 'password is missing',
          payload: {
            username: 'testuser',
            email: 'test@example.com',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'password', code: 'invalid_type' },
        },
        {
          scenario: 'email format is invalid',
          payload: {
            username: 'testuser',
            email: 'not-an-email',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'email', code: 'invalid_format' },
        },
        {
          scenario: 'username is less than 5 characters',
          payload: {
            username: 'usr',
            email: 'test@example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'username', code: 'too_small' },
        },
        {
          scenario: 'username exceeds 30 characters',
          payload: {
            username: 'u'.repeat(31),
            email: 'test@example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'username', code: 'too_big' },
        },
        {
          scenario: 'username contains invalid characters',
          payload: {
            username: 'invalid user!',
            email: 'test@example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'username', code: 'invalid_format' },
        },
        {
          scenario: 'password is less than 8 characters',
          payload: {
            username: 'testuser',
            email: 'test@example.com',
            password: 'short',
            role: UserRole.EMPLOYEE,
          },
          expectedError: { field: 'password', code: 'too_small' },
        },
        {
          scenario: 'role is invalid',
          payload: {
            username: 'testuser',
            email: 'test@example.com',
            password: 'SecurePass123',
            role: 'SUPERADMIN',
          },
          expectedError: { field: 'role', code: 'invalid_value' },
        },
      ])(
        'should return 400 when $scenario',
        async ({ payload, expectedError }) => {
          const response = await request(server)
            .post('/users')
            .set(authHeaders[UserRole.ROOT])
            .send(payload)
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            message: expect.any(String),
            timestamp: expect.any(String),
            errors: expect.arrayContaining([
              {
                field: expectedError.field,
                code: expectedError.code,
                message: expect.any(String),
              },
            ]),
            path: '/users',
          });
        },
      );
    });

    describe('Business rule errors', () => {
      it('should ALLOW registering with a username that was previously soft-deleted', async () => {
        await userHelper.insert({
          username: 'john_doe',
          email: 'old_john@example.com',
          deletedAt: new Date(), // Soft deleted
        });

        const response = await request(server)
          .post('/users')
          .set(authHeaders[UserRole.ROOT])
          .send({
            username: 'john_doe',
            email: 'new_john@example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          })
          .expect(201);

        expect(response.body.username).toBe('john_doe');
        expect(response.body.email).toBe('new_john@example.com');
        const raw = await userHelper.findByIdRaw(response.body.id);
        expect(raw).not.toBeNull();
        expect(raw).toMatchObject({
          username: 'john_doe',
          email: 'new_john@example.com',
          deletedAt: null,
        });
      });

      it('should ALLOW registering with a email that was previously soft-deleted', async () => {
        await userHelper.insert({
          username: 'john_doe',
          email: 'johndoe@example.com',
          deletedAt: new Date(), // Soft deleted
        });

        const response = await request(server)
          .post('/users')
          .set(authHeaders[UserRole.ROOT])
          .send({
            username: 'new_johndoe',
            email: 'johndoe@example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          })
          .expect(201);

        expect(response.body.username).toBe('new_johndoe');
        expect(response.body.email).toBe('johndoe@example.com');
        const raw = await userHelper.findByIdRaw(response.body.id);
        expect(raw).not.toBeNull();
        expect(raw).toMatchObject({
          username: 'new_johndoe',
          email: 'johndoe@example.com',
          deletedAt: null,
        });
      });

      it('should return 409 when username is already taken (case-insensitive)', async () => {
        await userHelper.insert({
          username: 'existinguser',
          email: 'existing@example.com',
        });

        const response = await request(server)
          .post('/users')
          .set(authHeaders[UserRole.ROOT])
          .send({
            username: 'ExistingUser',
            email: 'new@example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          })
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'USER_ALREADY_EXISTS',
          message: expect.stringMatching(/existinguser/i),
          path: '/users',
          timestamp: expect.any(String),
        });
      });

      it('should return 409 when email is already taken', async () => {
        await userHelper.insert({
          username: 'anotheruser',
          email: 'taken@example.com',
        });

        const response = await request(server)
          .post('/users')
          .set(authHeaders[UserRole.ROOT])
          .send({
            username: 'brandnewuser',
            email: 'Taken@Example.com',
            password: 'SecurePass123',
            role: UserRole.EMPLOYEE,
          })
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'USER_ALREADY_EXISTS',
          message: expect.stringMatching(/taken@example\.com/i),
          path: '/users',
          timestamp: expect.any(String),
        });
      });
    });
  });

  // ============================================================
  // GET /users — Get All Users
  // ============================================================
  describe('GET /users', () => {
    describe('Success cases', () => {
      it('should return an empty array when no users exist', async () => {
        const response = await request(server)
          .get('/users')
          .set(authHeaders[UserRole.ROOT])
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should return list of active users with complete fields and without sensitive data', async () => {
        await userHelper.insert({
          username: 'user_alpha',
          email: 'alpha@example.com',
          role: UserRole.ADMIN,
        });
        await userHelper.insert({
          username: 'user_beta',
          email: 'beta@example.com',
          role: UserRole.EMPLOYEE,
        });

        const response = await request(server)
          .get('/users')
          .set(authHeaders[UserRole.ROOT])
          .expect(200);

        expect(response.body).toHaveLength(2);

        expect(response.body).toStrictEqual([
          {
            id: expect.any(String),
            username: 'user_alpha',
            email: 'alpha@example.com',
            role: UserRole.ADMIN,
            isActive: true,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          {
            id: expect.any(String),
            username: 'user_beta',
            email: 'beta@example.com',
            role: UserRole.EMPLOYEE,
            isActive: true,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ]);
      });

      describe('View Users Permission Rules', () => {
        it.each([
          { role: UserRole.ROOT },
          { role: UserRole.ADMIN },
          { role: UserRole.HR },
        ])(
          'should include active and inactive users when requested by $role (has VIEW_INACTIVE_USERS)',
          async ({ role }) => {
            await userHelper.insert({
              username: 'active_user',
              email: 'active@example.com',
              isActive: true,
            });
            await userHelper.insert({
              username: 'inactive_user',
              email: 'inactive@example.com',
              isActive: false,
            });

            const response = await request(server)
              .get('/users')
              .set(authHeaders[role])
              .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ username: 'active_user' }),
                expect.objectContaining({ username: 'inactive_user' }),
              ]),
            );
          },
        );

        it('should FORBID EMPLOYEE from viewing users (Permission Denied)', async () => {
          await userHelper.insert({
            username: 'active_user',
            email: 'active@example.com',
            isActive: true,
          });

          const response = await request(server)
            .get('/users')
            .set(authHeaders[UserRole.EMPLOYEE])
            .expect(403);

          expect(response.body).toMatchObject({
            statusCode: 403,
            error: 'USER_PERMISSION_DENIED',
            message: expect.any(String),
            path: '/users',
            timestamp: expect.any(String),
          });
        });

        it.each([{ role: UserRole.ROOT }, { role: UserRole.ADMIN }])(
          'should include soft-deleted users when requested by $role',
          async ({ role }) => {
            await userHelper.insert({
              username: `normal_user`,
              email: `normal_user@example.com`,
            });
            await userHelper.insert({
              username: `deleted_user`,
              email: `deleted_user@example.com`,
              isActive: false, // should false if deletedAt is not null
              createdAt: new Date(),
              deletedAt: new Date(Date.now() + 1000), // Soft-deleted
            });

            const response = await request(server)
              .get('/users')
              .set(authHeaders[role])
              .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ username: `normal_user` }),
                expect.objectContaining({ username: `deleted_user` }),
              ]),
            );
          },
        );

        it('should exclude soft-deleted users when requested by HR', async () => {
          await userHelper.insert({
            username: 'normal_user',
            email: 'normal@example.com',
            isActive: true,
          });
          await userHelper.insert({
            username: 'deleted_user',
            email: 'deleted@example.com',
            isActive: false, // should false if deletedAt is not null
            deletedAt: new Date(), // Soft-deleted
          });

          const response = await request(server)
            .get('/users')
            .set(authHeaders[UserRole.HR])
            .expect(200);

          expect(response.body).toHaveLength(1);
          expect(response.body).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ username: 'normal_user' }),
            ]),
          );
        });
      });
    });
  });

  // ============================================================
  // PATCH /users/:id/activate — Activate User
  // ============================================================
  describe('PATCH /users/:id/activate', () => {
    describe('Success cases', () => {
      it('should respond 204 and activate an inactive user', async () => {
        const user = await userHelper.insert({
          username: 'inactive_user',
          email: 'inactive@example.com',
          isActive: false,
        });

        await request(server)
          .patch(`/users/${user.id}/activate`)
          .set(authHeaders[UserRole.ROOT])
          .expect(204);

        const raw = await userHelper.findByIdRaw(user.id);
        expect(raw).toMatchObject({
          id: user.id,
          username: user.username,
          email: user.email,
          isActive: true,
        });
      });
    });

    describe('Role Permission & Hierarchy Rules', () => {
      describe('Allowed Role Hierarchy Activation', () => {
        it.each([
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ADMIN,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.EMPLOYEE,
          },
        ])(
          'should ALLOW $actorRole to activate a user with role $targetRole',
          async ({ actorRole, targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `inact_${uniqueId}`,
              email: `inact_${uniqueId}@example.com`,
              isActive: false,
              role: targetRole,
            });

            await request(server)
              .patch(`/users/${user.id}/activate`)
              .set(authHeaders[actorRole])
              .expect(204);

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.isActive).toBe(true);
          },
        );
      });

      describe('Forbidden Role Hierarchy & Permission Creation', () => {
        it.each([
          { targetRole: UserRole.ADMIN },
          { targetRole: UserRole.HR },
          { targetRole: UserRole.ROOT },
          { targetRole: UserRole.EMPLOYEE },
        ])(
          'should FORBID EMPLOYEE from activating user with role $targetRole (Permission Denied)',
          async ({ targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `forbidden_${uniqueId}`,
              email: `forbidden_${uniqueId}@example.com`,
              isActive: false,
              role: targetRole,
            });

            const response = await request(server)
              .patch(`/users/${user.id}/activate`)
              .set(authHeaders[UserRole.EMPLOYEE])
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_PERMISSION_DENIED',
              message: expect.any(String),
              path: `/users/${user.id}/activate`,
              timestamp: expect.any(String),
            });

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.isActive).toBe(false);
          },
        );

        it.each([
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.ADMIN,
          },
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.ADMIN,
          },
        ])(
          'should FORBID $actorRole from activating user with role $targetRole (Hierarchy Violation)',
          async ({ actorRole, targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `forbidden_${uniqueId}`,
              email: `forbidden_${uniqueId}@example.com`,
              isActive: false,
              role: targetRole,
            });

            const response = await request(server)
              .patch(`/users/${user.id}/activate`)
              .set(authHeaders[actorRole])
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_HIERARCHY_VIOLATION',
              message: expect.any(String),
              path: `/users/${user.id}/activate`,
              timestamp: expect.any(String),
            });

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.isActive).toBe(false);
          },
        );
      });
    });

    describe('Business rule errors', () => {
      it('should return 409 when user is already active', async () => {
        const user = await userHelper.insert({
          username: 'already_active',
          email: 'alreadyactive@example.com',
          isActive: true,
        });

        const response = await request(server)
          .patch(`/users/${user.id}/activate`)
          .set(authHeaders[UserRole.ROOT])
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'USER_ALREADY_ACTIVE',
          message: expect.stringMatching(/already active/i),
          path: `/users/${user.id}/activate`,
          timestamp: expect.any(String),
        });
        expect(response.body.message).toContain(user.username);
      });
    });

    describe('Error cases', () => {
      it('should return 400 when id is not a valid UUID', async () => {
        const response = await request(server)
          .patch('/users/invalid-uuid/activate')
          .set(authHeaders[UserRole.ROOT])
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          error: 'Bad Request',
          path: '/users/invalid-uuid/activate',
          timestamp: expect.any(String),
        });
      });

      it('should return 404 when user is not found', async () => {
        const nonExistentId = crypto.randomUUID();

        const response = await request(server)
          .patch(`/users/${nonExistentId}/activate`)
          .set(authHeaders[UserRole.ROOT])
          .expect(404);

        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'USER_NOT_FOUND',
          message: expect.stringMatching(/not found/i),
          path: `/users/${nonExistentId}/activate`,
          timestamp: expect.any(String),
        });
      });
    });
  });

  // ============================================================
  // PATCH /users/:id/deactivate — Deactivate User
  // ============================================================
  describe('PATCH /users/:id/deactivate', () => {
    describe('Success cases', () => {
      it('should respond 204 and deactivate an active user', async () => {
        const user = await userHelper.insert({
          username: 'active_user',
          email: 'active@example.com',
          isActive: true,
        });

        await request(server)
          .patch(`/users/${user.id}/deactivate`)
          .set(authHeaders[UserRole.ROOT])
          .expect(204);

        const raw = await userHelper.findByIdRaw(user.id);
        expect(raw).toMatchObject({
          id: user.id,
          username: user.username,
          email: user.email,
          isActive: false,
        });
      });
    });

    describe('Role Permission & Hierarchy Rules', () => {
      describe('Allowed Role Hierarchy Deactivation', () => {
        it.each([
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ADMIN,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.EMPLOYEE,
          },
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.EMPLOYEE,
          },
        ])(
          'should ALLOW $actorRole to deactivate a user with role $targetRole',
          async ({ actorRole, targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `act_${uniqueId}`,
              email: `act_${uniqueId}@example.com`,
              isActive: true,
              role: targetRole,
            });

            await request(server)
              .patch(`/users/${user.id}/deactivate`)
              .set(authHeaders[actorRole])
              .expect(204);

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.isActive).toBe(false);
          },
        );
      });

      describe('Forbidden Role Hierarchy & Permission Deactivation', () => {
        it.each([
          { targetRole: UserRole.ADMIN },
          { targetRole: UserRole.HR },
          { targetRole: UserRole.ROOT },
          { targetRole: UserRole.EMPLOYEE },
        ])(
          'should FORBID EMPLOYEE from deactivating user with role $targetRole (Permission Denied)',
          async ({ targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `forbidden_${uniqueId}`,
              email: `forbidden_${uniqueId}@example.com`,
              isActive: true,
              role: targetRole,
            });

            const response = await request(server)
              .patch(`/users/${user.id}/deactivate`)
              .set(authHeaders[UserRole.EMPLOYEE])
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_PERMISSION_DENIED',
              message: expect.any(String),
              path: `/users/${user.id}/deactivate`,
              timestamp: expect.any(String),
            });

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.isActive).toBe(true);
          },
        );

        it.each([
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.ADMIN,
          },
          {
            actorRole: UserRole.HR,
            targetRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.ADMIN,
          },
        ])(
          'should FORBID $actorRole from deactivating user with role $targetRole (Hierarchy Violation)',
          async ({ actorRole, targetRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `forbidden_${uniqueId}`,
              email: `forbidden_${uniqueId}@example.com`,
              isActive: true,
              role: targetRole,
            });

            const response = await request(server)
              .patch(`/users/${user.id}/deactivate`)
              .set(authHeaders[actorRole])
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_HIERARCHY_VIOLATION',
              message: expect.any(String),
              path: `/users/${user.id}/deactivate`,
              timestamp: expect.any(String),
            });

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.isActive).toBe(true);
          },
        );
      });
    });

    describe('Business rule errors', () => {
      it.each([
        { actorRole: UserRole.ROOT },
        { actorRole: UserRole.ADMIN },
        { actorRole: UserRole.HR },
      ])(
        'should FORBID $actorRole from deactivating themselves (Self-Deactivation)',
        async ({ actorRole }) => {
          const user = await userHelper.insert({
            username: `self_${actorRole}`,
            email: `self_${actorRole}@example.com`,
            isActive: true,
            role: actorRole,
          });

          const response = await request(server)
            .patch(`/users/${user.id}/deactivate`)
            .set(await createAuthHeader(user.id, actorRole))
            .expect(403);

          expect(response.body).toMatchObject({
            statusCode: 403,
            error: 'SELF_DEACTIVATION_NOT_ALLOWED',
            message: expect.stringMatching(/deactivate/i),
            path: `/users/${user.id}/deactivate`,
            timestamp: expect.any(String),
          });

          const raw = await userHelper.findByIdRaw(user.id);
          expect(raw!.isActive).toBe(true);
        },
      );

      it('should return 409 when user is already inactive', async () => {
        const user = await userHelper.insert({
          username: 'already_inactive',
          email: 'alreadyinactive@example.com',
          isActive: false,
        });

        const response = await request(server)
          .patch(`/users/${user.id}/deactivate`)
          .set(authHeaders[UserRole.ROOT])
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'USER_ALREADY_INACTIVE',
          message: expect.stringMatching(/already inactive/i),
          path: `/users/${user.id}/deactivate`,
          timestamp: expect.any(String),
        });
        expect(response.body.message).toContain(user.username);
      });
    });

    describe('Error cases', () => {
      it('should return 400 when id is not a valid UUID', async () => {
        const response = await request(server)
          .patch('/users/not-a-uuid/deactivate')
          .set(authHeaders[UserRole.ROOT])
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          error: 'Bad Request',
          path: '/users/not-a-uuid/deactivate',
          timestamp: expect.any(String),
        });
      });

      it('should return 404 when user is not found', async () => {
        const nonExistentId = crypto.randomUUID();

        const response = await request(server)
          .patch(`/users/${nonExistentId}/deactivate`)
          .set(authHeaders[UserRole.ROOT])
          .expect(404);

        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'USER_NOT_FOUND',
          message: expect.stringMatching(/not found/i),
          path: `/users/${nonExistentId}/deactivate`,
          timestamp: expect.any(String),
        });
      });
    });
  });

  // ============================================================
  // PATCH /users/:id/role — Change User Role
  // ============================================================
  describe('PATCH /users/:id/role', () => {
    describe('Success cases', () => {
      it('should respond 204 and change the user role', async () => {
        const user = await userHelper.insert({
          username: 'role_change_user',
          email: 'rolechange@example.com',
          role: UserRole.EMPLOYEE,
        });

        await request(server)
          .patch(`/users/${user.id}/role`)
          .set(authHeaders[UserRole.ROOT])
          .send({ role: UserRole.HR })
          .expect(204);

        const raw = await userHelper.findByIdRaw(user.id);
        expect(raw).toMatchObject({
          id: user.id,
          username: user.username,
          email: user.email,
          role: UserRole.HR,
        });
      });
    });

    describe('Role Permission & Hierarchy Rules', () => {
      describe('Allowed Role Hierarchy Changes', () => {
        it.each([
          // ==========================================
          // ROOT (Can change anyone to any role)
          // ==========================================
          // Target: ROOT
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ROOT,
            newRole: UserRole.ADMIN,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ROOT,
            newRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ROOT,
            newRole: UserRole.EMPLOYEE,
          },

          // Target: ADMIN
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ADMIN,
            newRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ADMIN,
            newRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.ADMIN,
            newRole: UserRole.EMPLOYEE,
          },

          // Target: HR
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.HR,
            newRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.HR,
            newRole: UserRole.ADMIN,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.HR,
            newRole: UserRole.EMPLOYEE,
          },

          // Target: EMPLOYEE
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.EMPLOYEE,
            newRole: UserRole.ROOT,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.EMPLOYEE,
            newRole: UserRole.ADMIN,
          },
          {
            actorRole: UserRole.ROOT,
            targetRole: UserRole.EMPLOYEE,
            newRole: UserRole.HR,
          },

          // ==========================================
          // ADMIN (Can only manage HR <-> EMPLOYEE)
          // ==========================================
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.EMPLOYEE,
            newRole: UserRole.HR,
          },
          {
            actorRole: UserRole.ADMIN,
            targetRole: UserRole.HR,
            newRole: UserRole.EMPLOYEE,
          },
        ])(
          'should ALLOW $actorRole to change $targetRole to $newRole',
          async ({ actorRole, targetRole, newRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `user_${uniqueId}`,
              email: `user_${uniqueId}@example.com`,
              role: targetRole,
            });

            await request(server)
              .patch(`/users/${user.id}/role`)
              .set(authHeaders[actorRole])
              .send({ role: newRole })
              .expect(204);

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.role).toBe(newRole);
          },
        );
      });

      describe('Forbidden Role Hierarchy & Permission', () => {
        it.each([{ actorRole: UserRole.EMPLOYEE }, { actorRole: UserRole.HR }])(
          'should FORBID $actorRole from changing a user role (Permission Denied)',
          async ({ actorRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const user = await userHelper.insert({
              username: `permfail_${uniqueId}`,
              email: `permfail_${uniqueId}@example.com`,
              role: UserRole.EMPLOYEE,
            });

            const response = await request(server)
              .patch(`/users/${user.id}/role`)
              .set(authHeaders[actorRole])
              .send({ role: UserRole.HR })
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'USER_PERMISSION_DENIED',
              message: expect.any(String),
              path: `/users/${user.id}/role`,
              timestamp: expect.any(String),
            });

            const raw = await userHelper.findByIdRaw(user.id);
            expect(raw!.role).toBe(UserRole.EMPLOYEE);
          },
        );
      });

      it.each([
        // Invalid Target (actor rank <= target rank)
        {
          actorRole: UserRole.ADMIN,
          targetRole: UserRole.ROOT,
          newRole: UserRole.EMPLOYEE,
        },
        {
          actorRole: UserRole.ADMIN,
          targetRole: UserRole.ADMIN,
          newRole: UserRole.HR,
        },

        // Invalid New Role (actor rank <= new role rank)
        {
          actorRole: UserRole.ADMIN,
          targetRole: UserRole.EMPLOYEE,
          newRole: UserRole.ROOT,
        },
        {
          actorRole: UserRole.ADMIN,
          targetRole: UserRole.EMPLOYEE,
          newRole: UserRole.ADMIN,
        },
        {
          actorRole: UserRole.ADMIN,
          targetRole: UserRole.HR,
          newRole: UserRole.ROOT,
        },
        {
          actorRole: UserRole.ADMIN,
          targetRole: UserRole.HR,
          newRole: UserRole.ADMIN,
        },
      ])(
        'should FORBID $actorRole from changing $targetRole to $newRole (Hierarchy Violation)',
        async ({ actorRole, targetRole, newRole }) => {
          const uniqueId = crypto.randomUUID().slice(0, 8);
          const user = await userHelper.insert({
            username: `hierr_${uniqueId}`,
            email: `hierr_${uniqueId}@example.com`,
            role: targetRole,
          });

          const response = await request(server)
            .patch(`/users/${user.id}/role`)
            .set(authHeaders[actorRole])
            .send({ role: newRole })
            .expect(403);

          expect(response.body).toMatchObject({
            statusCode: 403,
            error: 'USER_HIERARCHY_VIOLATION',
            message: expect.any(String),
            path: `/users/${user.id}/role`,
            timestamp: expect.any(String),
          });

          const raw = await userHelper.findByIdRaw(user.id);
          expect(raw!.role).toBe(targetRole);
        },
      );
    });

    describe('Business rule errors', () => {
      it.each([{ actorRole: UserRole.ROOT }, { actorRole: UserRole.ADMIN }])(
        'should return 400 when $actorRole tries to change their own role',
        async ({ actorRole }) => {
          const user = await userHelper.insert({
            username: `self_${actorRole}`,
            email: `self_${actorRole}@example.com`,
            role: actorRole,
          });

          const response = await request(server)
            .patch(`/users/${user.id}/role`)
            .set(await createAuthHeader(user.id, actorRole))
            .send({ role: UserRole.EMPLOYEE })
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            error: 'SELF_ROLE_CHANGE_NOT_ALLOWED',
            message: expect.any(String),
            path: `/users/${user.id}/role`,
            timestamp: expect.any(String),
          });

          const raw = await userHelper.findByIdRaw(user.id);
          expect(raw!.role).toBe(actorRole);
        },
      );

      it.each([
        { actorRole: UserRole.ROOT, currentRole: UserRole.ROOT },
        { actorRole: UserRole.ROOT, currentRole: UserRole.ADMIN },
        { actorRole: UserRole.ROOT, currentRole: UserRole.HR },
        { actorRole: UserRole.ROOT, currentRole: UserRole.EMPLOYEE },

        { actorRole: UserRole.ADMIN, currentRole: UserRole.HR },
        { actorRole: UserRole.ADMIN, currentRole: UserRole.EMPLOYEE },
      ])(
        'should return 400 when $actorRole tries to change $currentRole to the same role',
        async ({ actorRole, currentRole }) => {
          const uniqueId = crypto.randomUUID().slice(0, 8);

          const user = await userHelper.insert({
            username: `unchanged_${uniqueId}`,
            email: `unchanged_${uniqueId}@example.com`,
            role: currentRole,
          });

          const response = await request(server)
            .patch(`/users/${user.id}/role`)
            .set(authHeaders[actorRole])
            .send({ role: currentRole })
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            error: 'USER_ROLE_UNCHANGED',
            message: expect.stringContaining(user.id),
            path: `/users/${user.id}/role`,
            timestamp: expect.any(String),
          });

          const raw = await userHelper.findByIdRaw(user.id);
          expect(raw!.role).toBe(currentRole);
        },
      );
    });

    describe('Request validation', () => {
      describe('Body validation', () => {
        it('should return 400 when role is not provided', async () => {
          const user = await userHelper.insert({
            username: 'norole_user',
            email: 'norole@example.com',
          });

          const response = await request(server)
            .patch(`/users/${user.id}/role`)
            .set(authHeaders[UserRole.ROOT])
            .send({})
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            message: expect.any(String),
            timestamp: expect.any(String),
            errors: expect.arrayContaining([
              {
                field: 'role',
                code: 'invalid_value',
                message: expect.any(String),
              },
            ]),
            path: `/users/${user.id}/role`,
          });
        });

        it('should return 400 when role value is invalid', async () => {
          const user = await userHelper.insert({
            username: 'badrole_user',
            email: 'badrole@example.com',
          });

          const response = await request(server)
            .patch(`/users/${user.id}/role`)
            .set(authHeaders[UserRole.ROOT])
            .send({ role: 'SUPERADMIN' })
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
            timestamp: expect.any(String),
            errors: expect.arrayContaining([
              {
                field: 'role',
                code: 'invalid_value',
                message: expect.any(String),
              },
            ]),
            path: `/users/${user.id}/role`,
          });
        });
      });

      describe('Parameters validation', () => {
        it('should return 400 when id is not a valid UUID', async () => {
          const response = await request(server)
            .patch('/users/not-a-uuid/role')
            .set(authHeaders[UserRole.ROOT])
            .send({ role: UserRole.ADMIN })
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            message: expect.any(String),
            error: 'Bad Request',
            path: `/users/not-a-uuid/role`,
            timestamp: expect.any(String),
          });
        });
      });
    });

    describe('Error cases', () => {
      it('should return 404 when user is not found', async () => {
        const nonExistentId = crypto.randomUUID();

        const response = await request(server)
          .patch(`/users/${nonExistentId}/role`)
          .set(authHeaders[UserRole.ROOT])
          .send({ role: UserRole.ADMIN })
          .expect(404);

        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'USER_NOT_FOUND',
          message: expect.stringMatching(/not found/i),
          path: `/users/${nonExistentId}/role`,
          timestamp: expect.any(String),
        });
      });
    });
  });
});
