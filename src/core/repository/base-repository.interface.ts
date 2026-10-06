import type { PageQuery } from '../../common/contracts/page-query.js';
import type { PageResult } from '../../common/contracts/page-result.js';
export interface BaseRepositoryInterface<TEntity,TCreate,TUpdate>{findById(id:string):Promise<TEntity|null>;findAll(query:PageQuery):Promise<PageResult<TEntity>>;create(data:TCreate):Promise<TEntity>;update(id:string,data:TUpdate):Promise<TEntity|null>;softDelete(id:string):Promise<boolean>;}
