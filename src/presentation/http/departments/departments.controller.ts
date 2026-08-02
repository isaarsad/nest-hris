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

@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly getDepartmentsUseCase: GetDepartmentsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  async getDepartments(
    @CurrentUser() user: RequestingUser,
  ): Promise<DepartmentResponseDto[]> {
    const departments = await this.getDepartmentsUseCase.execute(user);
    return departments.map((dept) => DepartmentPresenter.toResponse(dept));
  }
}
