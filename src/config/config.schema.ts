import * as Joi from 'joi';

const configSchema = Joi.object({
  LOG_LEVEL: Joi.string()
    .allow('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .optional()
    .default('info'),
  LOG_MIN_BUFFER: Joi.number().min(0).optional().default(4096),
  LOG_ASYNC: Joi.string().optional(),
  PORT: Joi.number().optional().default(3000),
  PG_DATABASE_WRITE_URL: Joi.string().required(),
  PG_DATABASE_READ_URL: Joi.string().required(),
  // add more configuration schema below
  JWT_SECRET: Joi.string().base64().required(),
  OPENSEARCH_NODE: Joi.string().required(),
  OPENSEARCH_CREDENTIAL: Joi.string()
    .regex(/^.+:.+$/) //{username}:password
    .optional(),
  //we limit default search result at 70, see https://postgres.cz/wiki/PostgreSQL_SQL_Tricks_I#Predicate_IN_optimalization
  OPENSEARCH_SEARCH_LIMIT: Joi.number().optional().default(70),
  WINGS_SURYA_API_URL: Joi.string().required(),
  SAYAP_MAS_UTAMA_API_URL: Joi.string().required(),
  WINGS_SURYA_OVERDUE_API_URL: Joi.string().required(),
  SAYAP_MAS_UTAMA_OVERDUE_API_URL: Joi.string().required(),
  EXTERNAL_API_TIMEOUT: Joi.string().optional().default(5000),
  CACHE_PREFIX: Joi.string().optional().default('sales'),
  TIMEOUT_IN_MILLISECONDS: Joi.number().optional().default(5000),
  PG_MAX_POOL_SIZE: Joi.number().optional().default(10),
  PG_CONNECTION_TIMEOUT_MILLIS: Joi.number().optional().default(5000),
  PG_IDLE_TIMEOUT_MILLIS: Joi.number().optional().default(30000),
  EVENTBRIDGE_EVENT_BUS: Joi.string().required(),
  REDIS_CLUSTER_MODE: Joi.boolean().optional().default(false),
  APP_CONFIG_ENDPOINT: Joi.string().optional(),
  APP_CONFIG_APPLICATION_NAME: Joi.string().required(),
  APP_CONFIG_ENVIRONMENT_NAME: Joi.string().required(),
  APP_CONFIG_PROFILE_NAME: Joi.string().required(),
});

export { configSchema };
