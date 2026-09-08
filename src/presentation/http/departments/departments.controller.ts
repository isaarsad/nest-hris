import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CreateDepartmentUseCase } from '../../../application/departments/create-department.use-case.js';
import { GetDepartmentsUseCase } from '../../../application/departments/get-departments.use-case.js';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import {
  DepartmentPresenter,
  DepartmentResponseDto,
} from './dto/department-response.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Departments')
@ApiBearerAuth('access-token')
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly getDepartmentsUseCase: GetDepartmentsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new department',
    description:
      'Creates a new department with the specified name, code, and optional parent department or head employee. Requires the requesting user to have CREATE_DEPARTMENT permissions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Department successfully created.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering',
        code: 'ENG',
        parentDepartmentId: null,
        headEmployeeId: '987fcdeb-51a2-43f7-9abc-def012345678',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (invalid payload structure or constraints).',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired Bearer access token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to create a department.',
  })
  @ApiResponse({
    status: 404,
    description: 'Referenced parent department or head employee not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'A department with the given name or code already exists.',
  })
  async create(
    @CurrentUser() user: RequestingUser,
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    const department = await this.createDepartmentUseCase.execute(user, {
      name: dto.name,
      code: dto.code,
      parentDepartmentId: dto.parentDepartmentId ?? null,
      headEmployeeId: dto.headEmployeeId ?? null,
    });

    return DepartmentPresenter.toResponse(department);
  }

  @Get()
  @ApiOperation({
    summary: 'List all departments',
    description:
      'Returns a list of all departments accessible to the requesting user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of departments successfully retrieved.',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Engineering',
          code: 'ENG',
          parentDepartmentId: null,
          headEmployeeId: '987fcdeb-51a2-43f7-9abc-def012345678',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '456abcde-f012-34gh-ij56-789012345678',
          name: 'Human Resources',
          code: 'HR',
          parentDepartmentId: null,
          headEmployeeId: null,
          isActive: true,
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired Bearer access token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to view departments.',
  })
  async getDepartments(
    @CurrentUser() user: RequestingUser,
  ): Promise<DepartmentResponseDto[]> {
    const departments = await this.getDepartmentsUseCase.execute(user);
    return departments.map((dept) => DepartmentPresenter.toResponse(dept));
  }
}
