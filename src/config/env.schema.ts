import Joi from 'joi';
export const envSchema=Joi.object({NODE_ENV:Joi.string().valid('development','test','production').default('development'),PORT:Joi.number().port().default(3000),DB_HOST:Joi.string().required(),DB_PORT:Joi.number().port().required(),DB_USERNAME:Joi.string().required(),DB_PASSWORD:Joi.string().required(),DB_NAME:Joi.string().required()});
