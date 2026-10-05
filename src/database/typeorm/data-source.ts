import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../../config/validated-env';
const env=validateEnvironment(process.env);
export const AppDataSource=new DataSource({type:'postgres',host:env.DB_HOST,port:env.DB_PORT,username:env.DB_USERNAME,password:env.DB_PASSWORD,database:env.DB_NAME,entities:['src/modules/**/persistence/*.entity.ts'],migrations:['src/database/migrations/*.ts'],synchronize:false});
export default AppDataSource;
