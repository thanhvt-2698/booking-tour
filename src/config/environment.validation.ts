import Joi from 'joi';
import { ConfigurationError } from './configuration.error';

const environmentSchema = Joi.object({
  API_PREFIX: Joi.string().trim().default('api'),
  DB_HOST: Joi.string().hostname().default('localhost'),
  DB_NAME: Joi.string().trim().default('booking_tour'),
  DB_PASSWORD: Joi.string().allow('').default('nestjs'),
  DB_PORT: Joi.number().port().default(5433),
  DB_TEST_NAME: Joi.string().trim().default('booking_tour_test'),
  DB_USERNAME: Joi.string().trim().default('nestjs'),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
}).unknown(true);

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const validationResult = environmentSchema.validate(environment, {
    abortEarly: false,
    convert: true,
  }) as Joi.ValidationResult<Record<string, unknown>>;

  if (validationResult.error) {
    throw new ConfigurationError(
      `Environment validation failed: ${validationResult.error.message}`,
    );
  }

  return validationResult.value;
}
