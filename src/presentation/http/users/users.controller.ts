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
  async create(
    @CurrentUser() user: RequestingUser,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const created = await this.createUserUseCase.execute(user, {
      username: dto.username,
      email: dto.email,
      passwordPlainText: dto.passwordPlainText,
      role: dto.role,
    });

    return UserPresenter.toResponse(created);
  }

  @Get()
  async getUsers(
    @CurrentUser() user: RequestingUser,
  ): Promise<UserResponseDto[]> {
    const users = await this.getUsersUseCase.execute(user);
    return users.map((u) => UserPresenter.toResponse(u));
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activate(
    @CurrentUser() user: RequestingUser,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.activateUserUseCase.execute(user, userId);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @CurrentUser() user: RequestingUser,
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.deactivateUserUseCase.execute(user, userId);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.NO_CONTENT)
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
