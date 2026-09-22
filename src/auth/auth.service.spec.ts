import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { DataSource, Repository } from 'typeorm';
import { AuthService } from './auth.service';
import type { RefreshTokenEntity } from './entities/refresh-token.entity';
import type { UsersService } from '../users/users.service';
import { UserStatus } from '../users/constants/user.constants';

describe('AuthService', () => {
  const findByEmail = jest.fn();
  const findById = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const repository = {
    findOne,
    update,
  } as unknown as Repository<RefreshTokenEntity>;
  const transaction = jest.fn(
    async (callback: (manager: unknown) => Promise<unknown>) =>
      callback({ getRepository: () => repository }),
  );
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      { transaction } as unknown as DataSource,
      {} as JwtService,
      repository,
      { findByEmail, findById } as unknown as UsersService,
    );
  });

  it('rejects missing, blocked and passwordless users with generic credentials error', async () => {
    for (const user of [
      null,
      { status: UserStatus.BLOCKED },
      { status: UserStatus.ACTIVE, passwordHash: null },
    ]) {
      findByEmail.mockResolvedValue(user);
      await expect(
        service.login({
          email: 'test@example.com',
          password: 'Password12345!',
        }),
      ).rejects.toThrow('errors.invalidCredentials');
    }
  });

  it('locks and rejects expired refresh tokens without rotating them', async () => {
    findOne.mockResolvedValue({ expiresAt: new Date(0), revokedAt: null });
    await expect(service.refresh('raw-secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findOne).toHaveBeenCalledWith({
      lock: { mode: 'pessimistic_write' },
      where: { tokenHash: expect.any(String) as unknown },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('hashes refresh tokens before revocation', async () => {
    update.mockResolvedValue({ affected: 1 });
    await service.logout('raw-secret');
    expect(JSON.stringify(update.mock.calls)).not.toContain('raw-secret');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) as unknown,
      }),
      expect.any(Object),
    );
  });
});
