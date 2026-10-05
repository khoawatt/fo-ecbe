import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { envSchema } from './env.schema';
@Global()
@Module({imports:[ConfigModule.forRoot({isGlobal:true,cache:true,expandVariables:true,validationSchema:envSchema,validationOptions:{abortEarly:false},load:[appConfig,databaseConfig]})],exports:[ConfigModule]})
export class AppConfigModule {}
