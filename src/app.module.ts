import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/typeorm/typeorm.module';
@Module({imports:[AppConfigModule,DatabaseModule],controllers:[AppController]})
export class AppModule {}
