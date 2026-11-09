import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/typeorm/typeorm.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccountHttpModule } from './modules/account-http/account-http.module.js';

@Module({
  imports: [AppConfigModule, DatabaseModule, AccountModule, AuthModule, AccountHttpModule],
  controllers: [AppController]
})
export class AppModule {}
