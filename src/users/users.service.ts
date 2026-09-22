import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { Repository } from 'typeorm';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { UserRole, UserStatus } from './constants/user.constants';
import type { AdminUserQueryDto } from './dto/admin-user-query.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto';
import type { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserEntity } from './entities/user.entity';
import type { AdminUserList } from './interfaces/admin-user-list.interface';
import type { CreateUserInput } from './interfaces/create-user-input.interface';
import type { UserResponse } from './interfaces/user-response.interface';

const ACTIVE_ADMIN_LOCK = 'booking-tour:active-admin';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(input: CreateUserInput): Promise<UserEntity> {
    const user = this.usersRepository.create({
      email: this.normalizeEmail(input.email),
      passwordHash: input.passwordHash,
      role: input.role ?? UserRole.USER,
      username: input.username.trim(),
    });

    try {
      return await this.usersRepository.save(user);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('errors.userConflict');
      }

      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findRequiredById(id: string): Promise<UserEntity> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

    return user;
  }

  async findByEmail(
    email: string,
    includePasswordHash = false,
  ): Promise<UserEntity | null> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.email = :email', {
        email: this.normalizeEmail(email),
      });

    if (includePasswordHash) {
      query.addSelect('user.passwordHash');
    }

    return query.getOne();
  }

  async findForAdmin(query: AdminUserQueryDto): Promise<AdminUserList> {
    const usersQuery = this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip(query.offset)
      .take(query.limit);

    if (query.role) {
      usersQuery.andWhere('user.role = :role', { role: query.role });
    }
    if (query.status) {
      usersQuery.andWhere('user.status = :status', { status: query.status });
    }

    const [users, totalItems] = await usersQuery.getManyAndCount();

    return {
      meta: createPaginationMeta(query.page, query.limit, totalItems),
      users: users.map((user) => this.toResponse(user)),
    };
  }

  async updateProfile(
    id: string,
    input: UpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.findRequiredById(id);
    const updates: Partial<UserEntity> = {};

    if (input.avatarUrl !== undefined) {
      updates.avatarUrl = input.avatarUrl.trim();
    }
    if (input.bio !== undefined) {
      updates.bio = input.bio.trim();
    }
    if (input.username !== undefined) {
      updates.username = input.username.trim();
    }

    Object.assign(user, updates);

    try {
      return await this.usersRepository.save(user);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('errors.usernameConflict');
      }

      throw error;
    }
  }

  async updateRole(
    actorId: string,
    targetId: string,
    input: UpdateUserRoleDto,
  ): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockActiveAdminInvariant(manager);
      const repository = manager.getRepository(UserEntity);
      const target = await this.findRequiredByIdWithRepository(
        repository,
        targetId,
      );

      if (
        actorId === targetId &&
        target.role === UserRole.ADMIN &&
        input.role !== UserRole.ADMIN
      ) {
        throw new ForbiddenException('errors.cannotChangeOwnAdminRole');
      }

      if (
        target.role === UserRole.ADMIN &&
        target.status === UserStatus.ACTIVE &&
        input.role !== UserRole.ADMIN
      ) {
        await this.ensureAnotherActiveAdmin(repository);
      }

      target.role = input.role;

      return repository.save(target);
    });
  }

  async updateStatus(
    actorId: string,
    targetId: string,
    input: UpdateUserStatusDto,
  ): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockActiveAdminInvariant(manager);
      const repository = manager.getRepository(UserEntity);
      const target = await this.findRequiredByIdWithRepository(
        repository,
        targetId,
      );

      if (actorId === targetId && input.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('errors.cannotBlockOwnAccount');
      }

      if (
        target.role === UserRole.ADMIN &&
        target.status === UserStatus.ACTIVE &&
        input.status !== UserStatus.ACTIVE
      ) {
        await this.ensureAnotherActiveAdmin(repository);
      }

      target.status = input.status;

      return repository.save(target);
    });
  }

  toResponse(user: UserEntity): UserResponse {
    return {
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      role: user.role,
      status: user.status,
      updatedAt: user.updatedAt,
      username: user.username,
    };
  }

  private async ensureAnotherActiveAdmin(
    usersRepository: Repository<UserEntity>,
  ): Promise<void> {
    const activeAdminCount = await usersRepository.count({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    });

    if (activeAdminCount <= 1) {
      throw new ConflictException('errors.lastActiveAdmin');
    }
  }

  private async findRequiredByIdWithRepository(
    usersRepository: Repository<UserEntity>,
    id: string,
  ): Promise<UserEntity> {
    const user = await usersRepository.findOne({
      lock: { mode: 'pessimistic_write' },
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

    return user;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }

  private async lockActiveAdminInvariant(
    manager: EntityManager,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      ACTIVE_ADMIN_LOCK,
    ]);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
