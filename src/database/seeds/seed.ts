import * as bcrypt from 'bcrypt';
import { PASSWORD_HASH_ROUNDS } from '../../auth/constants/auth.constants';
import { UserRole, UserStatus } from '../../users/constants/user.constants';
import { UserEntity } from '../../users/entities/user.entity';
import { AppDataSource } from '../data-source';
import { SeedConfigurationError, SeedConflictError } from './seed.errors';

const MIN_ADMIN_PASSWORD_LENGTH = 12;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new SeedConfigurationError(
      `[seed] Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function readAdminSeedInput() {
  const email = requiredEnvironmentVariable('SEED_ADMIN_EMAIL').toLowerCase();
  const username = requiredEnvironmentVariable('SEED_ADMIN_USERNAME');
  const password = requiredEnvironmentVariable('SEED_ADMIN_PASSWORD');

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new SeedConfigurationError(
      '[seed] SEED_ADMIN_EMAIL must be a valid email address',
    );
  }

  if (username.length < 3 || username.length > 30) {
    throw new SeedConfigurationError(
      '[seed] SEED_ADMIN_USERNAME must contain 3-30 characters',
    );
  }

  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new SeedConfigurationError(
      `[seed] SEED_ADMIN_PASSWORD must contain at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
    );
  }

  return { email, username, password };
}

async function seedAdmin() {
  const { email, username, password } = readAdminSeedInput();

  await AppDataSource.transaction(async (manager) => {
    const users = manager.getRepository(UserEntity);
    const [userByEmail, userByUsername] = await Promise.all([
      users.findOne({
        select: ['id', 'email', 'username', 'role', 'status'],
        where: { email },
      }),
      users.findOne({
        select: ['id', 'email', 'username', 'role', 'status'],
        where: { username },
      }),
    ]);

    if (userByEmail?.id !== userByUsername?.id) {
      throw new SeedConflictError(
        '[seed] SEED_ADMIN_EMAIL or SEED_ADMIN_USERNAME is already used by another account',
      );
    }

    const existingUser = userByEmail ?? userByUsername;

    if (existingUser) {
      if (
        existingUser.role !== UserRole.ADMIN ||
        existingUser.status !== UserStatus.ACTIVE
      ) {
        throw new SeedConflictError(
          '[seed] The existing seed account is not an active admin; review it before running the seed again',
        );
      }

      console.log('[seed] Admin already exists; no changes were made');
      return;
    }

    const user = users.create({
      email,
      passwordHash: await bcrypt.hash(password, PASSWORD_HASH_ROUNDS),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      username,
    });

    await users.save(user);
    console.log('[seed] Admin created successfully');
  });
}

async function seed() {
  try {
    await AppDataSource.initialize();
    await seedAdmin();
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void seed().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exitCode = 1;
});
