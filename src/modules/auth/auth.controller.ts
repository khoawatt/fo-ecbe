import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedAccount } from '../account/contracts/account-service.types.js';
import { AuthService } from './auth.service.js';
import { LoginRequestDto } from './dto/login-request.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import type { LoginResponse } from './types/auth-token.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  login(@Req() request: Request & { user: AuthenticatedAccount }, @Body() body: LoginRequestDto): Promise<LoginResponse> {
    void body;
    return this.auth.issueAccessToken(request.user);
  }
}
