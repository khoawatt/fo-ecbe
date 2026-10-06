import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import AppDataSource from '../../src/database/typeorm/data-source.js';
describe('PostgreSQL integration',()=>{beforeAll(async()=>{await AppDataSource.initialize();});afterAll(async()=>{if(AppDataSource.isInitialized)await AppDataSource.destroy();});it('executes a database query',async()=>{const result=await AppDataSource.query('SELECT 1 AS value');expect(Number(result[0].value)).toBe(1);});});
