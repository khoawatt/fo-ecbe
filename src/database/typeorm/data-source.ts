import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../../config/validated-env.js';

const env = validateEnvironment(process.env);

const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [`${import.meta.dirname}/../../modules/**/persistence/*.entity.${import.meta.filename.endsWith('.ts') ? 'ts' : 'js'}`],
  migrations: [`${import.meta.dirname}/../migrations/*.${import.meta.filename.endsWith('.ts') ? 'ts' : 'js'}`],
  synchronize: false
});

export default AppDataSource;
