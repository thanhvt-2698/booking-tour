import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { DataSource, Repository } from 'typeorm';
import { AuthService } from './auth.service';
import type { RefreshTokenEntity } from './entities/refresh-token.entity';
import type { UsersService } from '../users/users.service';
import type { FileStorageService } from '../files/file-storage.service';
import { UserStatus } from '../users/constants/user.constants';
import { UserEntity } from '../users/entities/user.entity';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import { RefreshTokenEntity as RefreshToken } from './entities/refresh-token.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('password-hash'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const findByEmail = jest.fn();
  const findById = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const create = jest.fn();
  const save = jest.fn();
  const createUser = jest.fn();
  const toResponse = jest.fn();
  const signAsync = jest.fn();
  const store = jest.fn();
  const removeBestEffort = jest.fn();
  const repository = {
    findOne,
    update,
    create,
    save,
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
      { signAsync } as unknown as JwtService,
      repository,
      {
        findByEmail,
        findById,
        create: createUser,
        toResponse,
      } as unknown as UsersService,
      { store, removeBestEffort } as unknown as FileStorageService,
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
      select: ['id', 'userId', 'familyId', 'expiresAt', 'revokedAt'],
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

  describe('avatar registration', () => {
    const avatar: UploadedImage = {
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: 5,
    };
    const key = 'avatars/00000000-0000-0000-0000-000000000001.png';
    const input = { email: 'test@example.com', password: 'Password12345!' };
    const user = {
      id: 'user-id',
      email: input.email,
      avatarUrl: `/uploads/${key}`,
    } as UserEntity;

    beforeEach(() => {
      transaction.mockImplementation(
        async (callback: (manager: unknown) => Promise<unknown>) =>
          callback({ getRepository: () => repository }),
      );
      createUser.mockResolvedValue(user);
      toResponse.mockReturnValue({ id: user.id, avatarUrl: user.avatarUrl });
      signAsync.mockResolvedValue('access-token');
      create.mockImplementation((token: unknown) => token);
      save.mockResolvedValue({});
      store.mockResolvedValue([
        {
          storageKey: key,
          url: user.avatarUrl,
          mimeType: 'image/png',
          originalName: 'avatar.png',
          sizeBytes: 5,
        },
      ]);
      removeBestEffort.mockResolvedValue(undefined);
    });

    it('creates the user and refresh token in one transaction with the stored avatar', async () => {
      const getRepository = jest.fn().mockReturnValue(repository);
      transaction.mockImplementation(
        async (callback: (manager: unknown) => Promise<unknown>) =>
          callback({ getRepository }),
      );

      const result = await service.register(input, avatar);

      expect(store).toHaveBeenCalledWith([avatar], 'avatars', 1);
      expect(getRepository).toHaveBeenCalledWith(UserEntity);
      expect(getRepository).toHaveBeenCalledWith(RefreshToken);
      expect(createUser).toHaveBeenCalledWith(
        {
          email: input.email,
          passwordHash: 'password-hash',
          avatarUrl: user.avatarUrl,
        },
        repository,
      );
      expect(result).toMatchObject({
        accessToken: 'access-token',
        user: { avatarUrl: user.avatarUrl },
      });
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(save).toHaveBeenCalledTimes(1);
      expect(removeBestEffort).not.toHaveBeenCalled();
    });

    it('preserves JSON registration without a file', async () => {
      await service.register(input);
      expect(store).not.toHaveBeenCalled();
      expect(createUser).toHaveBeenCalledWith(
        { email: input.email, passwordHash: 'password-hash' },
        repository,
      );
    });

    it('removes the new avatar when creating the user fails', async () => {
      createUser.mockRejectedValue(new Error('create failed'));
      await expect(service.register(input, avatar)).rejects.toThrow(
        'create failed',
      );
      expect(removeBestEffort).toHaveBeenCalledWith([key]);
      expect(save).not.toHaveBeenCalled();
    });

    it('removes the avatar if issuing the refresh token fails', async () => {
      save.mockRejectedValue(new Error('token save failed'));
      await expect(service.register(input, avatar)).rejects.toThrow(
        'token save failed',
      );
      expect(removeBestEffort).toHaveBeenCalledWith([key]);
    });

    it('removes the avatar when transaction commit fails', async () => {
      transaction.mockImplementation(
        async (callback: (manager: unknown) => Promise<unknown>) => {
          await callback({ getRepository: () => repository });
          throw new Error('commit failed');
        },
      );
      await expect(service.register(input, avatar)).rejects.toThrow(
        'commit failed',
      );
      expect(removeBestEffort).toHaveBeenCalledWith([key]);
    });

    it('does not create the user when storing the avatar is rejected', async () => {
      store.mockRejectedValue(new Error('invalid upload'));
      await expect(service.register(input, avatar)).rejects.toThrow(
        'invalid upload',
      );
      expect(createUser).not.toHaveBeenCalled();
      expect(removeBestEffort).not.toHaveBeenCalled();
    });
  });
});
