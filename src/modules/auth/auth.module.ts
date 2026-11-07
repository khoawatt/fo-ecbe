import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AccountModule } from '../account/account.module.js';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { LocalStrategy } from './strategies/local.strategy.js';

@Module({
  imports: [AccountModule, PassportModule.register({ session: false })],
  providers: [AuthService, LocalStrategy, LocalAuthGuard]
})
export class AuthModule {}
