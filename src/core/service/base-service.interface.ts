import type { ReadService } from './read-service.interface.js';
import type { WriteService } from './write-service.interface.js';
export interface BaseServiceInterface<TEntity,TCreate,TUpdate> extends ReadService<TEntity>,WriteService<TEntity,TCreate,TUpdate>{}
