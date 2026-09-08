import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LoginUseCase } from '../../../application/auth/login.use-case.js';
import { RefreshTokenUseCase } from '../../../application/auth/refresh-token.use-case.js';
import { LogoutUseCase } from '../../../application/auth/logout.use-case.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';
import { RevokeUserSessionsUseCase } from '../../../application/auth/revoke-user-sessions.use-case.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly revokeUserSessionsUseCase: RevokeUserSessionsUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user with email and password',
    description:
      'Authenticates user credentials and returns a new access/refresh token pair with user profile details.',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated and tokens issued.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (invalid payload structure or constraints).',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials provided.',
  })
  @ApiResponse({
    status: 403,
    description: 'User account is deactivated.',
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate access and refresh tokens',
    description:
      'Generates a new token pair using a valid, unexpired refresh token. Invalidates the old token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully rotated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (malformed or missing refresh token).',
  })
  @ApiResponse({
    status: 401,
    description:
      'Refresh token is invalid, expired, or already revoked outside leeway.',
  })
  @ApiResponse({
    status: 403,
    description: 'User account is deactivated.',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Log out user and revoke refresh token',
    description:
      'Revokes the provided refresh token. Operates idempotently even if the token is already revoked or not found.',
  })
  @ApiResponse({
    status: 204,
    description: 'User successfully logged out.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (missing refresh token payload).',
  })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.logoutUseCase.execute({
      refreshToken: dto.refreshToken,
    });
  }

  @Delete(':id/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Revoke all active sessions for a target user',
    description:
      'Revokes all active refresh tokens for the specified target user. Requires adequate role permissions and hierarchy clearance.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Target user UUID whose sessions will be revoked',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'All active sessions for target user successfully revoked.',
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
      'Insufficient permissions or role hierarchy violation (e.g. Employee revoking other users or lower rank targeting higher rank).',
  })
  @ApiResponse({
    status: 404,
    description: 'Target user not found.',
  })
  async revokeSessions(
    @CurrentUser() currentUser: RequestingUser,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ) {
    await this.revokeUserSessionsUseCase.execute(currentUser, targetUserId);
  }
}
