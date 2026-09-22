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
});
