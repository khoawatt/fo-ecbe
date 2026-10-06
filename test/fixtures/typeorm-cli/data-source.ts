import 'dotenv/config';
import 'reflect-metadata';
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('fo014_cli_smoke')
class TypeOrmCliSmokeEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  value!: string;
}

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
  synchronize: false
});
