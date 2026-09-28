import {
  DEFAULT_REDIS_PORT,
  DEFAULT_SMTP_PORT,
} from '../common/constants/app.constants';
import { validateEnvironment } from './environment.validation';

describe('Environment configuration', () => {
  it('uses development JWT defaults but requires a strong production secret', () => {
    expect(
      validateEnvironment({ NODE_ENV: 'development' }).JWT_SECRET,
    ).toHaveLength(34);
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow();
    expect(() =>
      validateEnvironment({ NODE_ENV: 'production', JWT_SECRET: 'short' }),
    ).toThrow();
    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'x'.repeat(40),
      }).NODE_ENV,
    ).toBe('production');
  });

  it('rejects invalid database and application configuration', () => {
    expect(() => validateEnvironment({ DB_PORT: 70000 })).toThrow();
    expect(() => validateEnvironment({ NODE_ENV: 'invalid' })).toThrow();
  });

  it('uses safe default configuration for Redis and mail delivery', () => {
    expect(validateEnvironment({})).toMatchObject({
      MAIL_ENABLED: false,
      MAIL_PORT: DEFAULT_SMTP_PORT,
      REDIS_PORT: DEFAULT_REDIS_PORT,
    });
  });
});
