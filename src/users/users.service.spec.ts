import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UserRole, UserStatus } from './constants/user.constants';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let repository: jest.Mocked<Repository<UserEntity>>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    service = new UsersService(repository);
  });

  it('normalizes email before creating a user', async () => {
    const createdUser = { id: 'user-id' } as UserEntity;
    repository.create.mockReturnValue(createdUser);
    repository.save.mockResolvedValue(createdUser);

    await service.create({
      email: ' User@Example.COM ',
      passwordHash: 'hash',
      username: 'jake',
    });

    expect(repository.create.mock.calls[0]?.[0]).toEqual({
      email: 'user@example.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      username: 'jake',
    });
  });

  it('maps unique constraint violations to conflict', async () => {
    const createdUser = {} as UserEntity;
    repository.create.mockReturnValue(createdUser);
    repository.save.mockRejectedValue({ code: '23505' });

    await expect(
      service.create({
        email: 'jake@example.com',
        passwordHash: 'hash',
        username: 'jake',
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
      username: 'jake',
    } as UserEntity;

    expect(service.toResponse(user)).not.toHaveProperty('passwordHash');
  });
});
