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
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
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
  async logout(@Body() dto: RefreshTokenDto) {
    await this.logoutUseCase.execute({
      refreshToken: dto.refreshToken,
    });
  }

  @Delete(':id/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSessions(
    @CurrentUser() currentUser: RequestingUser,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ) {
    await this.revokeUserSessionsUseCase.execute(currentUser, targetUserId);
  }
}
