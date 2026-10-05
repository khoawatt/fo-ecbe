import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
export function createTypeOrmOptions(config:ConfigService):TypeOrmModuleOptions { return {type:'postgres',host:config.getOrThrow<string>('database.host'),port:config.getOrThrow<number>('database.port'),username:config.getOrThrow<string>('database.username'),password:config.getOrThrow<string>('database.password'),database:config.getOrThrow<string>('database.name'),autoLoadEntities:true,synchronize:false}; }
