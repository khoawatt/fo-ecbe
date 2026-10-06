import type { PageQuery } from '../../common/contracts/page-query.js';
import type { PageResult } from '../../common/contracts/page-result.js';
export interface ReadService<TEntity>{findById(id:string):Promise<TEntity>;findAll(query:PageQuery):Promise<PageResult<TEntity>>;}
