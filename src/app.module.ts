import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/typeorm/typeorm.module.js';
@Module({imports:[AppConfigModule,DatabaseModule],controllers:[AppController]})
export class AppModule {}
