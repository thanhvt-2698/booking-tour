import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';

export interface JwtConfig {
  accessTokenExpiresIn: SignOptions['expiresIn'];
  refreshTokenTtlDays: number;
  secret: string;
}

export const getJwtConfig = (): JwtConfig => ({
  accessTokenExpiresIn: (process.env.JWT_EXPIRES_IN ??
    '1h') as SignOptions['expiresIn'],
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  secret: process.env.JWT_SECRET ?? 'development-only-secret-0123456789',
});
