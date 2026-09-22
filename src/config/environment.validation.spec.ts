import { validateEnvironment } from './environment.validation';

describe('Environment configuration', () => {
  it('boots development without credentials for deferred integrations', () => {
    expect(
      validateEnvironment({ NODE_ENV: 'development' }).JWT_SECRET,
    ).toHaveLength(34);
  });

  it('requires a strong production JWT secret but not Google or SMTP credentials', () => {
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
});
