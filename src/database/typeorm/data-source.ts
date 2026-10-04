import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: required('DB_HOST'),
  port: Number(process.env.DB_PORT ?? 5432),
  username: required('DB_USERNAME'),
  password: required('DB_PASSWORD'),
  database: required('DB_NAME'),
  entities: [join(__dirname, '../../modules/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  synchronize: false
});

export default AppDataSource;
