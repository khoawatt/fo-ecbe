import Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  JWT_ACCESS_SECRET: Joi.string().required().custom((value: string, helpers) =>
    Buffer.byteLength(value, 'utf8') >= 32 ? value : helpers.error('string.min')
  ),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(1).max(900).default(900),
  JWT_ACCESS_ISSUER: Joi.string().trim().min(1).default('fo-ecbe'),
  JWT_ACCESS_AUDIENCE: Joi.string().trim().min(1).default('fo-ecbe-api'),
  JWT_REFRESH_SECRET: Joi.string().required().custom((value: string, helpers) =>
    Buffer.byteLength(value, 'utf8') >= 32 ? value : helpers.error('string.min')
  ),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().min(60).max(2592000).default(604800),
  JWT_REFRESH_ISSUER: Joi.string().trim().min(1).default('fo-ecbe'),
  JWT_REFRESH_AUDIENCE: Joi.string().trim().min(1).default('fo-ecbe-refresh'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required()
});
