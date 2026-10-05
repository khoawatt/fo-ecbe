import { PageQuery } from '../../common/contracts/page-query';
import { PageResult } from '../../common/contracts/page-result';
export interface ReadService<TEntity>{findById(id:string):Promise<TEntity>;findAll(query:PageQuery):Promise<PageResult<TEntity>>;}
