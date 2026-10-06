import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './app.config.js';
import { databaseConfig } from './database.config.js';
import { validateEnvironment } from './validated-env.js';
@Global()
@Module({imports:[ConfigModule.forRoot({isGlobal:true,cache:true,expandVariables:true,validate:validateEnvironment,load:[appConfig,databaseConfig]})],exports:[ConfigModule]})
export class AppConfigModule {}
