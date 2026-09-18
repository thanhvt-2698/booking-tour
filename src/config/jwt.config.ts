import 'dotenv/config';

export const getJwtConfig = () => ({
  expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  secret: process.env.JWT_SECRET ?? 'development-only-secret',
});
