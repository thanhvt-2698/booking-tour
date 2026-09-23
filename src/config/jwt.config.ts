import 'dotenv/config';

import type { SignOptions } from 'jsonwebtoken';

export interface JwtConfig {
  accessTokenExpiresIn: SignOptions['expiresIn'];
  audience: string;
  issuer: string;
  refreshTokenTtlDays: number;
  secret: string;
}

export const getJwtConfig = (): JwtConfig => ({
  accessTokenExpiresIn: (process.env.JWT_EXPIRES_IN ??
    '1h') as SignOptions['expiresIn'],
  audience: process.env.JWT_AUDIENCE ?? 'booking-tour-client',
  issuer: process.env.JWT_ISSUER ?? 'booking-tour-api',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  secret: process.env.JWT_SECRET ?? 'development-only-secret-0123456789',
});
