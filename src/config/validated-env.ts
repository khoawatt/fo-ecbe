import { envSchema } from './env.schema';
export interface ValidatedEnv { NODE_ENV:'development'|'test'|'production'; PORT:number; DB_HOST:string; DB_PORT:number; DB_USERNAME:string; DB_PASSWORD:string; DB_NAME:string; }
export function validateEnvironment(env:NodeJS.ProcessEnv):ValidatedEnv { const {value,error}=envSchema.validate(env,{abortEarly:false,allowUnknown:true,stripUnknown:false}); if(error) throw new Error(`Invalid environment configuration: ${error.message}`); return value as ValidatedEnv; }
