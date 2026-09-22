import { validateEnvironment } from './environment.validation';

describe('Environment configuration', () => {
  it('boots without credentials for deferred authentication and integrations', () => {
    for (const NODE_ENV of ['development', 'production']) {
      expect(validateEnvironment({ NODE_ENV }).NODE_ENV).toBe(NODE_ENV);
    }
  });

  it('rejects invalid database and application configuration', () => {
    expect(() => validateEnvironment({ DB_PORT: 70000 })).toThrow();
    expect(() => validateEnvironment({ NODE_ENV: 'invalid' })).toThrow();
  });
});
