export interface WriteService<TEntity,TCreate,TUpdate>{create(data:TCreate):Promise<TEntity>;update(id:string,data:TUpdate):Promise<TEntity>;remove(id:string):Promise<void>;}
