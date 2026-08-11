import { User } from '../../../../domain/users/entities/user.entity.js';
import { UserRole } from '../../../../domain/users/user-role-permissions.js';

export interface UserResponseDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserPresenter {
  static toResponse(entity: User): UserResponseDto {
    return {
      id: entity.id,
      username: entity.username.value,
      email: entity.email.value,
      role: entity.role,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
