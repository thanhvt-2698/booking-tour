import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import { DataSource, IsNull } from 'typeorm';
import { getJwtConfig } from '../config/jwt.config';
import { UserStatus } from '../users/constants/user.constants';
import type { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import {
  PASSWORD_HASH_ROUNDS,
  REFRESH_TOKEN_BYTES,
} from './constants/auth.constants';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { TokenPair } from './interfaces/token-pair.interface';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
    private readonly usersService: UsersService,
  ) {}

  async register(input: RegisterDto): Promise<TokenPair> {
    const passwordHash = await bcrypt.hash(
      input.password,
      PASSWORD_HASH_ROUNDS,
    );
    const user = await this.usersService.create({
      email: input.email,
      passwordHash,
    });

    return this.issueTokenPair(user);
  }

  async login(input: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(input.email, true);

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.passwordHash ||
      !(await bcrypt.compare(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('errors.invalidCredentials');
    }

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const pair = await this.dataSource.transaction(async (manager) => {
      const refreshTokensRepository = manager.getRepository(RefreshTokenEntity);
      const storedToken = await refreshTokensRepository.findOne({
        select: ['id', 'userId', 'familyId', 'expiresAt', 'revokedAt'],
        lock: { mode: 'pessimistic_write' },
        where: { tokenHash },
      });

      if (!storedToken || storedToken.expiresAt <= new Date()) {
        return null;
      }

      if (storedToken.revokedAt) {
        await refreshTokensRepository.update(
          { familyId: storedToken.familyId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );

        return null;
      }

      const user = await this.usersService.findById(storedToken.userId);

      if (!user || user.status !== UserStatus.ACTIVE) {
        return null;
      }

      await refreshTokensRepository.update(storedToken.id, {
        revokedAt: new Date(),
      });

      return this.issueTokenPair(
        user,
        storedToken.familyId,
        refreshTokensRepository,
      );
    });

    if (!pair) {
      throw new UnauthorizedException('errors.invalidRefreshToken');
    }

    return pair;
  }
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokensRepository.update(
      {
        revokedAt: IsNull(),
        tokenHash: this.hashRefreshToken(refreshToken),
      },
      { revokedAt: new Date() },
    );
  }

  private async issueTokenPair(
    user: UserEntity,
    familyId: string = randomUUID(),
    refreshTokensRepository = this.refreshTokensRepository,
  ): Promise<TokenPair> {
    const jwtConfig = getJwtConfig();
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
      },
      {
        audience: jwtConfig.audience,
        expiresIn: jwtConfig.accessTokenExpiresIn,
        issuer: jwtConfig.issuer,
      },
    );
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + jwtConfig.refreshTokenTtlDays);

    await refreshTokensRepository.save(
      refreshTokensRepository.create({
        expiresAt,
        familyId,
        revokedAt: null,
        tokenHash: this.hashRefreshToken(refreshToken),
        userId: user.id,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toResponse(user),
    };
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
