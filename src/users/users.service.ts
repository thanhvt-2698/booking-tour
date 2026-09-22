import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UserRole } from './constants/user.constants';
import { UserEntity } from './entities/user.entity';
import type { CreateUserInput } from './interfaces/create-user-input.interface';
import type { UserResponse } from './interfaces/user-response.interface';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
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
    return this.usersRepository.findOne({ where: { id } });
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

  async updateProfile(
    id: string,
    input: UpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }

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

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
