import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
async function bootstrap(): Promise<void> { const app=await NestFactory.create(AppModule); const config=app.get(ConfigService); app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true})); await app.listen(config.get<number>('app.port',3000)); }
void bootstrap();
