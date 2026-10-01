import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import type { FileStorageService } from '../files/file-storage.service';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import { UserRole, UserStatus } from './constants/user.constants';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let repository: jest.Mocked<Repository<UserEntity>>;
  let service: UsersService;
  let transaction: jest.Mock;
  let fileStorage: jest.Mocked<
    Pick<FileStorageService, 'store' | 'toKey' | 'removeBestEffort'>
  >;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    transaction = jest.fn(
      async (callback: (manager: unknown) => Promise<unknown>) =>
        callback({ getRepository: () => repository }),
    );
    fileStorage = {
      store: jest.fn(),
      toKey: jest.fn(),
      removeBestEffort: jest.fn().mockResolvedValue(undefined),
    };
    service = new UsersService(
      { transaction } as unknown as DataSource,
      repository,
      fileStorage as unknown as FileStorageService,
    );
  });

  it('normalizes email before creating a user', async () => {
    const createdUser = { id: 'user-id' } as UserEntity;
    repository.create.mockReturnValue(createdUser);
    repository.save.mockResolvedValue(createdUser);

    await service.create({
      email: ' User@Example.COM ',
      passwordHash: 'hash',
    });

    expect(repository.create.mock.calls[0]?.[0]).toEqual({
      email: 'user@example.com',
      passwordHash: 'hash',
      role: UserRole.USER,
    });
  });

  it('maps unique constraint violations to conflict', async () => {
    const createdUser = {} as UserEntity;
    repository.create.mockReturnValue(createdUser);
    repository.save.mockRejectedValue({
      code: POSTGRES_UNIQUE_VIOLATION_CODE,
    });

    await expect(
      service.create({
        email: 'jake@example.com',
        passwordHash: 'hash',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not expose password hash in the response mapper', () => {
    const user = {
      avatarUrl: null,
      bio: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      email: 'jake@example.com',
      id: 'user-id',
      passwordHash: 'secret-hash',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as UserEntity;

    expect(service.toResponse(user)).not.toHaveProperty('passwordHash');
  });

  describe('profile avatar updates', () => {
    const avatar: UploadedImage = {
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: 5,
    };
    const previousKey = 'avatars/00000000-0000-0000-0000-000000000001.png';
    const newKey = 'avatars/00000000-0000-0000-0000-000000000002.png';

    beforeEach(() => {
      repository.findOne.mockResolvedValue({
        id: 'user-id',
        bio: 'old bio',
        avatarUrl: `/uploads/${previousKey}`,
      } as UserEntity);
      repository.save.mockImplementation((user) =>
        Promise.resolve(user as UserEntity),
      );
      fileStorage.toKey.mockReturnValue(previousKey);
      fileStorage.store.mockResolvedValue([
        {
          storageKey: newKey,
          url: `/uploads/${newKey}`,
          mimeType: 'image/png',
          originalName: 'avatar.png',
          sizeBytes: 5,
        },
      ]);
    });

    it('locks the current profile and removes its old avatar only after commit', async () => {
      let committed = false;
      transaction.mockImplementation(
        async (callback: (manager: unknown) => Promise<unknown>) => {
          const result = await callback({ getRepository: () => repository });
          committed = true;
          return result;
        },
      );
      fileStorage.removeBestEffort.mockImplementation(() => {
        expect(committed).toBe(true);
        return Promise.resolve();
      });

      const result = await service.updateProfile(
        'user-id',
        { bio: ' updated bio ' },
        avatar,
      );

      expect(repository.findOne.mock.calls).toContainEqual([
        {
          select: ['id', 'avatarUrl', 'bio'],
          lock: { mode: 'pessimistic_write' },
          where: { id: 'user-id' },
        },
      ]);
      expect(fileStorage.store).toHaveBeenCalledWith([avatar], 'avatars', 1);
      expect(result).toMatchObject({
        avatarUrl: `/uploads/${newKey}`,
        bio: 'updated bio',
      });
      expect(fileStorage.removeBestEffort).toHaveBeenCalledWith([previousKey]);
    });

    it('rejects file and URL together before uploading or opening a transaction', async () => {
      await expect(
        service.updateProfile(
          'user-id',
          { avatarUrl: 'https://example.com/avatar.png' },
          avatar,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileStorage.store).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });

    it('cleans the new file and keeps the old file when the save fails', async () => {
      const failure = new Error('database unavailable');
      repository.save.mockRejectedValue(failure);

      await expect(service.updateProfile('user-id', {}, avatar)).rejects.toBe(
        failure,
      );
      expect(fileStorage.removeBestEffort).toHaveBeenCalledTimes(1);
      expect(fileStorage.removeBestEffort).toHaveBeenCalledWith([newKey]);
    });

    it('cleans the new upload if the user no longer exists', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(
        service.updateProfile('user-id', {}, avatar),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.save.mock.calls).toHaveLength(0);
      expect(fileStorage.removeBestEffort).toHaveBeenCalledWith([newKey]);
    });

    it('keeps managed avatars when updating only the bio', async () => {
      await service.updateProfile('user-id', { bio: ' new bio ' });
      expect(fileStorage.store).not.toHaveBeenCalled();
      expect(fileStorage.toKey).not.toHaveBeenCalled();
      expect(fileStorage.removeBestEffort).not.toHaveBeenCalled();
      expect(repository.save.mock.calls).toContainEqual([
        expect.objectContaining({
          bio: 'new bio',
          avatarUrl: `/uploads/${previousKey}`,
        }),
      ]);
    });

    it('does not delete external avatars when replacing them with an upload', async () => {
      repository.findOne.mockResolvedValue({
        id: 'user-id',
        avatarUrl: 'https://example.com/old.png',
      } as UserEntity);
      fileStorage.toKey.mockReturnValue(null);
      await service.updateProfile('user-id', {}, avatar);
      expect(fileStorage.removeBestEffort).not.toHaveBeenCalled();
    });

    it('removes a managed avatar after replacing it with an external URL', async () => {
      await service.updateProfile('user-id', {
        avatarUrl: ' https://example.com/new.png ',
      });
      expect(repository.save.mock.calls).toContainEqual([
        expect.objectContaining({ avatarUrl: 'https://example.com/new.png' }),
      ]);
      expect(fileStorage.removeBestEffort).toHaveBeenCalledWith([previousKey]);
    });

    it('keeps a managed avatar when the same URL is submitted', async () => {
      await service.updateProfile('user-id', {
        avatarUrl: `/uploads/${previousKey}`,
      });
      expect(fileStorage.removeBestEffort).not.toHaveBeenCalled();
    });

    it('does not enter the database transaction when image storage fails', async () => {
      fileStorage.store.mockRejectedValue(
        new BadRequestException('errors.imageInvalid'),
      );
      await expect(
        service.updateProfile('user-id', {}, avatar),
      ).rejects.toThrow('errors.imageInvalid');
      expect(transaction).not.toHaveBeenCalled();
    });

    it('clears nullable profile fields and removes the previous managed avatar', async () => {
      const result = await service.updateProfile('user-id', {
        avatarUrl: null,
        bio: null,
      });
      expect(result).toMatchObject({ avatarUrl: null, bio: null });
      expect(fileStorage.removeBestEffort).toHaveBeenCalledWith([previousKey]);
    });

    it('rejects a clear-avatar request combined with an uploaded avatar', async () => {
      await expect(
        service.updateProfile('user-id', { avatarUrl: null }, avatar),
      ).rejects.toThrow('errors.avatarFileAndUrlConflict');
      expect(fileStorage.store).not.toHaveBeenCalled();
    });

    it('cleans the new avatar when the transaction fails to commit', async () => {
      transaction.mockImplementation(
        async (callback: (manager: unknown) => Promise<unknown>) => {
          await callback({ getRepository: () => repository });
          throw new Error('commit failed');
        },
      );
      await expect(
        service.updateProfile('user-id', {}, avatar),
      ).rejects.toThrow('commit failed');
      expect(fileStorage.removeBestEffort).toHaveBeenCalledTimes(1);
      expect(fileStorage.removeBestEffort).toHaveBeenCalledWith([newKey]);
    });
  });
});
