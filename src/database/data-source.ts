import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/validated-env.js';
import { SnakeNamingStrategy } from './typeorm/snake-naming.strategy.js';

const env = validateEnvironment(process.env);

const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [`${import.meta.dirname}/entities/*.entity.js`],
  migrations: [`${import.meta.dirname}/migrations/*.js`],
  synchronize: false,
  migrationsTransactionMode: 'all',
});

export default AppDataSource;
