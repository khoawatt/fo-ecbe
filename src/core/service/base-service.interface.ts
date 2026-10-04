import { ReadService } from './read-service.interface';
import { WriteService } from './write-service.interface';

export interface BaseServiceInterface<TEntity, TCreate, TUpdate>
  extends ReadService<TEntity>, WriteService<TEntity, TCreate, TUpdate> {}
