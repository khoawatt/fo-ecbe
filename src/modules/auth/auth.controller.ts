import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedAccount } from '../account/contracts/account-service.types.js';
import { AuthService } from './auth.service.js';
import { LoginRequestDto } from './dto/login-request.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import type { TokenPairResponse } from './types/auth-token.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  login(@Req() request: Request & { user: AuthenticatedAccount }, @Body() body: LoginRequestDto, @Headers('user-agent') userAgent?: string): Promise<TokenPairResponse> {
    void body;
    return this.auth.issueTokenPair(request.user, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshTokenDto): Promise<TokenPairResponse> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() body: RefreshTokenDto): Promise<void> {
    return this.auth.logout(body.refreshToken);
  }
}
