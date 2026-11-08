import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AccountController } from './account.controller.js';

@Module({
  imports: [AccountModule, AuthModule, AuthorizationModule],
  controllers: [AccountController]
})
export class AccountHttpModule {}
