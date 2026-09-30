export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export const USER_PROFILE_UPDATE_FIELDS = ['id', 'avatarUrl', 'bio'] as const;
