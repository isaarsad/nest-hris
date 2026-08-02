import { z } from 'zod';
import { CreateDepartmentInput } from '../../../../application/departments/create-department.use-case.js';
import { createZodDto } from 'nestjs-zod';

export const createDepartmentSchema: z.ZodType<CreateDepartmentInput> =
  z.object({
    name: z
      .string({
        message: 'Department name is required and must be a text string',
      })
      .trim()
      .min(1, 'Department name cannot be empty')
      .max(100, 'Department name cannot exceed 100 characters'),
    code: z
      .string({
        message: 'Department code is required and must be a text string',
      })
      .trim()
      .toUpperCase()
      .min(2, 'Department code must be at least 2 characters')
      .max(10, 'Department code cannot exceed 10 characters'),
    parentDepartmentId: z
      .uuid('Invalid parent department ID format')
      .nullable()
      .optional(),
    headEmployeeId: z
      .uuid('Invalid head employee ID format')
      .nullable()
      .optional(),
  });

export class CreateDepartmentDto extends createZodDto(createDepartmentSchema) {}
