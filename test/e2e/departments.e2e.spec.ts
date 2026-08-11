import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { DepartmentTableTestHelper } from '../helpers/department-table-test.helper.js';
import { Server } from 'http';

describe('Departments (E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let dataSource: DataSource;
  let departmentHelper: DepartmentTableTestHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    server = app.getHttpServer() as Server;

    dataSource = moduleFixture.get<DataSource>(DataSource);
    departmentHelper = new DepartmentTableTestHelper(dataSource);
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
          .send(payload)
          .expect(201);

        expect(response.body.headEmployeeId).toBe(headEmployeeId);
      });

      it('should convert code to uppercase before saving', async () => {
        const payload = { name: 'Marketing', code: 'mkt' };

        const response = await request(server)
          .post('/departments')
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
          .send(payload)
          .expect(201);

        expect(response.body.parentDepartmentId).toBeNull();
        expect(response.body.headEmployeeId).toBeNull();
      });
    });

    describe('Payload validation', () => {
      it('should return 400 when department name is not provided', async () => {
        const response = await request(server)
          .post('/departments')
          .send({ code: 'HR' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'name',
              message: 'Department name is required and must be a text string',
            },
          ]),
        );
      });

      it('should return 400 when department code is not provided', async () => {
        const response = await request(server)
          .post('/departments')
          .send({ name: 'Human Resources' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'code',
              message: 'Department code is required and must be a text string',
            },
          ]),
        );
      });

      it('should return 400 when department name is an empty string', async () => {
        const response = await request(server)
          .post('/departments')
          .send({ name: '', code: 'HR' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'name',
              message: 'Department name cannot be empty',
            },
          ]),
        );
      });

      it('should return 400 when name exceeds 100 characters', async () => {
        const response = await request(server)
          .post('/departments')
          .send({ name: 'A'.repeat(101), code: 'HR' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'name',
              message: 'Department name cannot exceed 100 characters',
            },
          ]),
        );
      });

      it('should return 400 when code is less than 2 characters', async () => {
        const response = await request(server)
          .post('/departments')
          .send({ name: 'Human Resources', code: 'H' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'code',
              message: 'Department code must be at least 2 characters',
            },
          ]),
        );
      });

      it('should return 400 when code exceeds 10 characters', async () => {
        const response = await request(server)
          .post('/departments')
          .send({ name: 'Human Resources', code: 'TOOLONGCODE' })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'code',
              message: 'Department code cannot exceed 10 characters',
            },
          ]),
        );
      });

      it('should return 400 when parentDepartmentId is not a valid UUID', async () => {
        const response = await request(server)
          .post('/departments')
          .send({
            name: 'Human Resources',
            code: 'HR',
            parentDepartmentId: 'invalid-uuid',
          })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'parentDepartmentId',
              message: 'Invalid parent department ID format',
            },
          ]),
        );
      });

      it('should return 400 when headEmployeeId is not a valid UUID', async () => {
        const response = await request(server)
          .post('/departments')
          .send({
            name: 'Human Resources',
            code: 'HR',
            headEmployeeId: 'not-a-uuid',
          })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Validation failed',
          timestamp: expect.any(String),
        });
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            {
              field: 'headEmployeeId',
              message: 'Invalid head employee ID format',
            },
          ]),
        );
      });
    });

    describe('Business rule error', () => {
      it('should return 409 when name is already used (case-insensitive)', async () => {
        await departmentHelper.insert({
          id: crypto.randomUUID(),
          name: 'Finance',
          code: 'FIN',
        });

        const response = await request(server)
          .post('/departments')
          .send({ name: 'Finance', code: 'FIN2' })
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'DEPARTMENT_ALREADY_EXISTS',
          message: expect.stringMatching(/finance/i),
          timestamp: expect.any(String),
        });
      });

      it('should return 409 when code is already used (case-insensitive)', async () => {
        await departmentHelper.insert({
          id: crypto.randomUUID(),
          name: 'Finance',
          code: 'FIN',
        });

        const response = await request(server)
          .post('/departments')
          .send({ name: 'Finance New', code: 'FIN' })
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          error: 'DEPARTMENT_ALREADY_EXISTS',
          message: expect.stringMatching(/fin/i),
          timestamp: expect.any(String),
        });
      });

      it('should return 404 when parentDepartmentId is not found in the database', async () => {
        const nonExistentId = crypto.randomUUID();

        const response = await request(server)
          .post('/departments')
          .send({
            name: 'Child Department',
            code: 'CHILD',
            parentDepartmentId: nonExistentId,
          })
          .expect(404);

        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'DEPARTMENT_NOT_FOUND',
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
        const response = await request(server).get('/departments').expect(200);

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

        const response = await request(server).get('/departments').expect(200);

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

      it('should return departments with complete field structures', async () => {
        await departmentHelper.insert({
          name: 'Technology',
          code: 'TECH',
        });

        const response = await request(server).get('/departments').expect(200);

        expect(response.body[0]).toMatchObject({
          id: expect.any(String),
          name: 'Technology',
          code: 'TECH',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
        });
      });

      /**
       * The CurrentUser decorator currently returns UserRole.ADMIN as a hardcoded value.
       * ADMIN has permission to VIEW_INACTIVE_DEPARTMENTS but not VIEW_DELETED_DEPARTMENTS.
       * Therefore, inactive departments are included in the response, but deleted departments are not.
       */
      it('should include inactive departments because ADMIN has VIEW_INACTIVE_DEPARTMENTS permission', async () => {
        await departmentHelper.insert({
          name: 'Active Department',
          code: 'ACT',
          isActive: true,
        });
        await departmentHelper.insert({
          name: 'Inactive Department',
          code: 'INA',
          isActive: false,
        });

        const response = await request(server).get('/departments').expect(200);

        expect(response.body).toHaveLength(2);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const names = response.body.map((d: { name: string }) => d.name);
        expect(names).toContain('Active Department');
        expect(names).toContain('Inactive Department');
      });

      it('should exclude soft-deleted departments when user lacks VIEW_DELETED_DEPARTMENTS permission', async () => {
        await departmentHelper.insert({
          name: 'Normal Department',
          code: 'NORM',
        });
        await departmentHelper.insert({
          name: 'Deleted Department',
          code: 'DEL',
          deletedAt: new Date(),
        });

        const response = await request(server).get('/departments').expect(200);

        // Hanya yang tidak deleted yang tampil
        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('Normal Department');
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

        const response = await request(server).get('/departments').expect(200);

        expect(response.body).toHaveLength(3);

        // Active departments muncul duluan, lalu diurutkan per nama
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const names = response.body.map((d: { name: string }) => d.name);
        expect(names[0]).toBe('Alpha Dept');
        expect(names[1]).toBe('Zebra Dept');
        expect(names[2]).toBe('Inactive Dept');
      });
    });

    describe('Data integration - create then get', () => {
      it('should display newly created department via POST in GET endpoint', async () => {
        await request(server)
          .post('/departments')
          .send({ name: 'Legal', code: 'LEG' })
          .expect(201);

        const response = await request(server).get('/departments').expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({
          name: 'Legal',
          code: 'LEG',
          isActive: true,
        });
      });

      it('should successfully create multiple departments and retrieve all of them', async () => {
        const departments = [
          { name: 'Engineering', code: 'ENG' },
          { name: 'Product', code: 'PRD' },
          { name: 'Design', code: 'DSG' },
        ];

        for (const dept of departments) {
          await request(server).post('/departments').send(dept).expect(201);
        }

        const response = await request(server).get('/departments').expect(200);

        expect(response.body).toHaveLength(3);
      });
    });
  });

  // ============================================================
  // Additional scenarios — Error Response Shape
  // ============================================================
  describe('Error response shape', () => {
    it('should contain statusCode, message, and timestamp fields in error response', async () => {
      const response = await request(server)
        .post('/departments')
        .send({}) // invalid payload
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should contain error and message fields in 409 conflict error response', async () => {
      await departmentHelper.insert({ name: 'Engineering', code: 'ENG' });

      const response = await request(server)
        .post('/departments')
        .send({ name: 'Engineering', code: 'ENG2' })
        .expect(409);

      expect(response.body).toHaveProperty(
        'error',
        'DEPARTMENT_ALREADY_EXISTS',
      );
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should contain error field with DEPARTMENT_NOT_FOUND in 404 error response', async () => {
      const response = await request(server)
        .post('/departments')
        .send({
          name: 'Child',
          code: 'CHD',
          parentDepartmentId: crypto.randomUUID(),
        })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'DEPARTMENT_NOT_FOUND');
      expect(response.body).toHaveProperty('statusCode', 404);
    });
  });
});
