import { DataSource } from 'typeorm';
import AppDataSource from '../../src/database/typeorm/data-source';

describe('PostgreSQL integration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = AppDataSource;
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('connects to PostgreSQL and executes a query', async () => {
    const result = await dataSource.query('SELECT 1 AS ok');
    expect(Number(result[0].ok)).toBe(1);
  });
});
