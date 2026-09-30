export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export const MAX_AVATAR_IMAGE_COUNT = 1;
export const AVATAR_IMAGE_FOLDER_NAME = 'avatars';

export const USER_PROFILE_UPDATE_FIELDS = ['id', 'avatarUrl', 'bio'] as const;
