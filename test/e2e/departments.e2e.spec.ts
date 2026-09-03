import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { DepartmentTableTestHelper } from '../helpers/department-table-test.helper.js';
import { createAuthHeader } from '../helpers/auth-token-test.helper.js';
import { UserRole } from '../../src/domain/users/user-role-permissions.js';
import { Server } from 'http';

describe('Departments (E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let dataSource: DataSource;
  let departmentHelper: DepartmentTableTestHelper;
  let rootAuthHeader: Record<string, string>;
  let adminAuthHeader: Record<string, string>;
  let hrAuthHeader: Record<string, string>;
  let employeeAuthHeader: Record<string, string>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    server = app.getHttpServer() as Server;

    dataSource = moduleFixture.get<DataSource>(DataSource);
    departmentHelper = new DepartmentTableTestHelper(dataSource);

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
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await departmentHelper.clear();
  });

  describe('POST /departments', () => {
    describe('Success cases', () => {
      it('should respond 201 and return the created department on valid payload', async () => {
        const payload = {
          name: 'Human Resources',
          code: 'HR',
        };

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send(payload)
          .expect(201);

        expect(response.body).toEqual({
          id: expect.any(String),
          name: 'Human Resources',
          code: 'HR',
          parentDepartmentId: null,
          headEmployeeId: null,
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });

        const createdId = response.body.id;

        const raw = await departmentHelper.findByIdRaw(createdId);
        expect(raw).toStrictEqual({
          id: createdId,
          name: 'Human Resources',
          code: 'HR',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          deletedAt: null,
        });
      });

      it('should create a department with a valid parentDepartmentId', async () => {
        const parent = await departmentHelper.insert({
          id: crypto.randomUUID(),
          name: 'Engineering',
          code: 'ENG',
        });

        const payload = {
          name: 'Frontend Team',
          code: 'FE',
          parentDepartmentId: parent.id,
        };

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send(payload)
          .expect(201);

        expect(response.body).toMatchObject({
          name: 'Frontend Team',
          code: 'FE',
          parentDepartmentId: parent.id,
        });
      });

      it('should create a department with a valid headEmployeeId', async () => {
        const headEmployeeId = crypto.randomUUID();

        const payload = {
          name: 'Finance',
          code: 'FIN',
          headEmployeeId,
        };

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send(payload)
          .expect(201);

        expect(response.body.headEmployeeId).toBe(headEmployeeId);
      });

      it('should convert code to uppercase before saving', async () => {
        const payload = { name: 'Marketing', code: 'mkt' };

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send(payload)
          .expect(201);

        expect(response.body.code).toBe('MKT');
        const raw = await departmentHelper.findByIdRaw(response.body.id);
        expect(raw).toMatchObject({
          code: 'MKT',
        });
      });

      it('should accept explicit null for optional relation fields', async () => {
        const payload = {
          name: 'Operations',
          code: 'OPS',
          parentDepartmentId: null,
          headEmployeeId: null,
        };

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send(payload)
          .expect(201);

        expect(response.body.parentDepartmentId).toBeNull();
        expect(response.body.headEmployeeId).toBeNull();
      });
    });

    describe('Authentication Guard (401 Unauthorized)', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const response = await request(server)
          .post('/departments')
          .send({ name: 'Finance', code: 'FIN' })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_INVALID',
          message: expect.any(String),
          path: '/departments',
          timestamp: expect.any(String),
        });
      });

      it('should return 401 when token is malformed or invalid', async () => {
        const response = await request(server)
          .post('/departments')
          .set({ Authorization: 'Bearer this-is-obviously-a-fake-token' })
          .send({ name: 'Finance', code: 'FIN' })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_INVALID',
          message: expect.any(String),
          path: '/departments',
          timestamp: expect.any(String),
        });
      });
    });

    describe('Role Permission & Hierarchy Rules', () => {
      describe('Allowed Roles (has CREATE_DEPARTMENT permission)', () => {
        it.each([
          { actorRole: () => rootAuthHeader, roleName: 'ROOT' },
          { actorRole: () => adminAuthHeader, roleName: 'ADMIN' },
        ])(
          'should ALLOW $roleName to create a department',
          async ({ actorRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const payload = {
              name: `Dept ${uniqueId}`,
              code: uniqueId.slice(0, 3).toUpperCase(),
            };

            const response = await request(server)
              .post('/departments')
              .set(actorRole())
              .send(payload)
              .expect(201);

            expect(response.body).toMatchObject({
              id: expect.any(String),
              name: payload.name,
              code: payload.code,
              isActive: true,
            });
          },
        );
      });

      describe('Forbidden Roles (lacks CREATE_DEPARTMENT permission)', () => {
        it.each([
          { actorRole: () => hrAuthHeader, roleName: 'HR' },
          { actorRole: () => employeeAuthHeader, roleName: 'EMPLOYEE' },
        ])(
          'should FORBID $roleName from creating a department (Permission Denied)',
          async ({ actorRole }) => {
            const uniqueId = crypto.randomUUID().slice(0, 8);
            const payload = {
              name: `Forbidden ${uniqueId}`,
              code: uniqueId.slice(0, 3).toUpperCase(),
            };

            const response = await request(server)
              .post('/departments')
              .set(actorRole())
              .send(payload)
              .expect(403);

            expect(response.body).toMatchObject({
              statusCode: 403,
              error: 'DEPARTMENT_PERMISSION_DENIED',
              message: expect.any(String),
              path: '/departments',
              timestamp: expect.any(String),
            });
          },
        );
      });
    });

    describe('Payload validation', () => {
      it('should return 400 when department name is not provided', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ code: 'HR' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'name',
              code: 'invalid_type',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });

      it('should return 400 when department code is not provided', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ name: 'Human Resources' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'code',
              code: 'invalid_type',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });

      it('should return 400 when department name is an empty string', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ name: '', code: 'HR' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'name',
              code: 'too_small',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });

      it('should return 400 when name exceeds 100 characters', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ name: 'A'.repeat(101), code: 'HR' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'name',
              code: 'too_big',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });

      it('should return 400 when code is less than 2 characters', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ name: 'Human Resources', code: 'H' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'code',
              code: 'too_small',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });

      it('should return 400 when code exceeds 10 characters', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ name: 'Human Resources', code: 'TOOLONGCODE' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'code',
              code: 'too_big',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });

      it('should return 400 when parentDepartmentId is not a valid UUID', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({
            name: 'Human Resources',
            code: 'HR',
            parentDepartmentId: 'invalid-uuid',
          })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'parentDepartmentId',
              code: 'invalid_format',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });

      it('should return 400 when headEmployeeId is not a valid UUID', async () => {
        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({
            name: 'Human Resources',
            code: 'HR',
            headEmployeeId: 'not-a-uuid',
          })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: expect.any(String),
          timestamp: expect.any(String),
          errors: expect.arrayContaining([
            {
              field: 'headEmployeeId',
              code: 'invalid_format',
              message: expect.any(String),
            },
          ]),
          path: '/departments',
        });
      });
    });

    describe('Business rule error', () => {
      it('should return 409 when name is already taken (case-insensitive)', async () => {
        await departmentHelper.insert({
          id: crypto.randomUUID(),
          name: 'Finance',
          code: 'FIN',
        });

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ name: 'Finance', code: 'FIN2' })
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'DEPARTMENT_ALREADY_EXISTS',
          path: '/departments',
          message: expect.stringMatching(/finance/i),
          timestamp: expect.any(String),
        });
      });

      it('should return 409 when code is already taken (case-insensitive)', async () => {
        await departmentHelper.insert({
          id: crypto.randomUUID(),
          name: 'Finance',
          code: 'FIN',
        });

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({ name: 'Finance New', code: 'FIN' })
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'DEPARTMENT_ALREADY_EXISTS',
          path: '/departments',
          message: expect.stringMatching(/fin/i),
          timestamp: expect.any(String),
        });
      });

      it('should return 404 when parentDepartmentId is not found in the database', async () => {
        const nonExistentId = crypto.randomUUID();

        const response = await request(server)
          .post('/departments')
          .set(rootAuthHeader)
          .send({
            name: 'Child Department',
            code: 'CHILD',
            parentDepartmentId: nonExistentId,
          })
          .expect(404);

        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'DEPARTMENT_NOT_FOUND',
          path: '/departments',
          message: expect.stringMatching(/not found/i),
          timestamp: expect.any(String),
        });
      });
    });
  });

  // ============================================================
  // GET /departments — Get All Departments // After user and auth
  // ============================================================
  describe('GET /departments', () => {
    describe('Success cases', () => {
      it('should return an empty array when no departments exist', async () => {
        const response = await request(server)
          .get('/departments')
          .set(rootAuthHeader)
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should return all active departments', async () => {
        await departmentHelper.insert({ name: 'Engineering', code: 'ENG' });
        await departmentHelper.insert({ name: 'Finance', code: 'FIN' });
        await departmentHelper.insert({
          name: 'Human Resources',
          code: 'HR',
          isActive: false,
        });

        const response = await request(server)
          .get('/departments')
          .set(rootAuthHeader)
          .expect(200);

        expect(response.body).toHaveLength(3);
        expect(response.body).toEqual(
          expect.arrayContaining([
            {
              id: expect.any(String),
              name: 'Engineering',
              code: 'ENG',
              parentDepartmentId: null,
              headEmployeeId: null,
              isActive: true,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            },
            {
              id: expect.any(String),
              name: 'Finance',
              code: 'FIN',
              parentDepartmentId: null,
              headEmployeeId: null,
              isActive: true,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            },
            {
              id: expect.any(String),
              name: 'Human Resources',
              code: 'HR',
              parentDepartmentId: null,
              headEmployeeId: null,
              isActive: false,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            },
          ]),
        );
      });

      it('should return results ordered by isActive DESC and name ASC', async () => {
        await departmentHelper.insert({
          name: 'Zebra Dept',
          code: 'ZEB',
          isActive: true,
        });
        await departmentHelper.insert({
          name: 'Alpha Dept',
          code: 'ALP',
          isActive: true,
        });
        await departmentHelper.insert({
          name: 'Inactive Dept',
          code: 'INA',
          isActive: false,
        });

        const response = await request(server)
          .get('/departments')
          .set(rootAuthHeader)
          .expect(200);

        expect(response.body).toHaveLength(3);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const names = response.body.map((d: { name: string }) => d.name);
        expect(names[0]).toBe('Alpha Dept');
        expect(names[1]).toBe('Zebra Dept');
        expect(names[2]).toBe('Inactive Dept');
      });
    });

    describe('Authentication Guard (401 Unauthorized)', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const response = await request(server).get('/departments').expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_INVALID',
          message: expect.any(String),
          path: '/departments',
          timestamp: expect.any(String),
        });
      });

      it('should return 401 when token is malformed or invalid', async () => {
        const response = await request(server)
          .get('/departments')
          .set({ Authorization: 'Bearer random-garbage-jwt' })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'TOKEN_INVALID',
          message: expect.any(String),
          path: '/departments',
          timestamp: expect.any(String),
        });
      });
    });

    describe('Role Permission Rules', () => {
      describe('VIEW_INACTIVE_DEPARTMENTS permission', () => {
        it.each([
          { role: UserRole.ROOT },
          { role: UserRole.ADMIN },
          { role: UserRole.HR },
        ])(
          'should include inactive departments when requested by $role (has VIEW_INACTIVE_DEPARTMENTS)',
          async ({ role }) => {
            await departmentHelper.insert({
              name: 'Active Dept',
              code: 'ACTD',
              isActive: true,
            });
            await departmentHelper.insert({
              name: 'Inactive Dept',
              code: 'INAD',
              isActive: false,
            });

            const response = await request(server)
              .get('/departments')
              .set(await createAuthHeader(crypto.randomUUID(), role))
              .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ name: 'Active Dept' }),
                expect.objectContaining({ name: 'Inactive Dept' }),
              ]),
            );
          },
        );

        it('should exclude inactive departments when requested by EMPLOYEE (lacks VIEW_INACTIVE_DEPARTMENTS)', async () => {
          await departmentHelper.insert({
            name: 'Active Dept',
            code: 'ACTD',
            isActive: true,
          });
          await departmentHelper.insert({
            name: 'Inactive Dept',
            code: 'INAD',
            isActive: false,
          });

          const response = await request(server)
            .get('/departments')
            .set(employeeAuthHeader)
            .expect(200);

          expect(response.body).toHaveLength(1);
          expect(response.body[0].name).toBe('Active Dept');
        });
      });

      describe('VIEW_DELETED_DEPARTMENTS permission', () => {
        it('should include soft-deleted departments when requested by ROOT (has VIEW_DELETED_DEPARTMENTS)', async () => {
          await departmentHelper.insert({
            name: 'Normal Dept',
            code: 'NORM',
          });
          await departmentHelper.insert({
            name: 'Deleted Dept',
            code: 'DELD',
            deletedAt: new Date(),
          });

          const response = await request(server)
            .get('/departments')
            .set(rootAuthHeader)
            .expect(200);

          expect(response.body).toHaveLength(2);
          expect(response.body).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ name: 'Normal Dept' }),
              expect.objectContaining({ name: 'Deleted Dept' }),
            ]),
          );
        });

        it.each([
          { actorRole: () => adminAuthHeader, roleName: 'ADMIN' },
          { actorRole: () => hrAuthHeader, roleName: 'HR' },
          { actorRole: () => employeeAuthHeader, roleName: 'EMPLOYEE' },
        ])(
          'should exclude soft-deleted departments when requested by $roleName (lacks VIEW_DELETED_DEPARTMENTS)',
          async ({ actorRole }) => {
            await departmentHelper.insert({
              name: 'Normal Dept',
              code: 'NORM',
            });
            await departmentHelper.insert({
              name: 'Deleted Dept',
              code: 'DELD',
              deletedAt: new Date(),
            });

            const response = await request(server)
              .get('/departments')
              .set(actorRole())
              .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].name).toBe('Normal Dept');
          },
        );
      });
    });
  });
});
