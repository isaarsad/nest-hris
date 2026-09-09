import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserUseCase } from '../../../application/users/create-user.use-case.js';
import { GetUsersUseCase } from '../../../application/users/get-users.use-case.js';
import { ActivateUserUseCase } from '../../../application/users/activate-user.use-case.js';
import { DeactivateUserUseCase } from '../../../application/users/deactivate-user.use-case.js';
import { ChangeUserRoleUseCase } from '../../../application/users/change-user-role.use-case.js';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { UserPresenter, UserResponseDto } from './dto/user-response.dto.js';
import { ChangeUserRoleDto } from './dto/change-user-role.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly changeUserRoleUseCase: ChangeUserRoleUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Creates a new user account with the specified role. Requires the requesting user to have CREATE_USER permission and a role hierarchy superior to the target role being assigned.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        email: 'john@example.com',
        role: 'EMPLOYEE',
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
    description:
      "Insufficient permissions or role hierarchy violation (e.g. assigning a role equal to or higher than the requesting user's role).",
  })
  @ApiResponse({
    status: 409,
    description: 'A user with the given username or email already exists.',
  })
  async create(
    @CurrentUser() user: RequestingUser,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const created = await this.createUserUseCase.execute(user, {
      username: dto.username,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });

    return UserPresenter.toResponse(created);
  }

  @Get()
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns a list of users visible to the requesting user. Scope varies by role: lower-privileged roles may only see active, non-deleted users, while higher-privileged roles may also see inactive or soft-deleted users.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users successfully retrieved.',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
          email: 'john@example.com',
          role: 'ADMIN',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          username: 'janedoe',
          email: 'jane@example.com',
          role: 'EMPLOYEE',
          isActive: false,
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
    description: 'Insufficient permissions to view users.',
  })
  async getUsers(
    @CurrentUser() user: RequestingUser,
  ): Promise<UserResponseDto[]> {
    const users = await this.getUsersUseCase.execute(user);
    return users.map((u) => UserPresenter.toResponse(u));
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Activate a user account',
    description:
      'Activates the specified user account. Requires ACTIVATE_USER permission and a role hierarchy superior to the target user.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Target user UUID to activate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'User account successfully activated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format in route parameter.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, malformed, or expired Bearer access token.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions or role hierarchy violation (e.g. attempting to activate a user of equal or higher rank).',
  })
  @ApiResponse({
    status: 404,
    description: 'Target user not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Target user is already active.',
  })
  async activate(
    @CurrentUser() user: RequestingUser,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.activateUserUseCase.execute(user, userId);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate a user account',
    description:
      'Deactivates the specified user account. Requires DEACTIVATE_USER permission and a role hierarchy superior to the target user. A user cannot deactivate their own account.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Target user UUID to deactivate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'User account successfully deactivated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format in route parameter.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired Bearer access token.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions, role hierarchy violation, or attempting to deactivate own account.',
  })
  @ApiResponse({
    status: 404,
    description: 'Target user not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Target user is already deactivated.',
  })
  async deactivate(
    @CurrentUser() user: RequestingUser,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.deactivateUserUseCase.execute(user, userId);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Change the role of a user',
    description:
      "Assigns a new role to the specified user. Requires UPDATE_USER_ROLE permission, a role hierarchy superior to the target user's current role, and the ability to assign the new role. A user cannot change their own role.",
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Target user UUID whose role will be changed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'User role successfully changed.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error (invalid payload structure, invalid role value, or invalid UUID format).',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, malformed, or expired Bearer access token.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions, role hierarchy violation (current or new role), or attempting to change own role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Target user not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Target user already has the requested role.',
  })
  async changeRole(
    @CurrentUser() user: RequestingUser,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: ChangeUserRoleDto,
  ): Promise<void> {
    await this.changeUserRoleUseCase.execute(user, {
      userId,
      newRole: dto.role,
    });
  }
}
