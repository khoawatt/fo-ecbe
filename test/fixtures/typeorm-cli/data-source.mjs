import 'dotenv/config';
import 'reflect-metadata';
import { DataSource, EntitySchema } from 'typeorm';

const TypeOrmCliSmokeEntity = new EntitySchema({
  name: 'TypeOrmCliSmoke',
  tableName: 'fo014_cli_smoke',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    value: {
      type: String,
    },
  },
});

const migrations = process.env.TYPEORM_SMOKE_MIGRATIONS
  ? [process.env.TYPEORM_SMOKE_MIGRATIONS]
  : [];

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [TypeOrmCliSmokeEntity],
  migrations,
  migrationsTableName: 'fo014_cli_smoke_migrations',
  synchronize: false,
});
