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
export const USER_AVATAR_UPLOAD_FIELD_NAME = 'avatar';
export const USER_EMAIL_MAX_LENGTH = 254;
export const USER_BIO_MIN_LENGTH = 1;
export const USER_BIO_MAX_LENGTH = 500;

export const USER_ERROR_KEYS = {
  avatarFileAndUrlConflict: 'errors.avatarFileAndUrlConflict',
} as const;

export const USER_PROFILE_UPDATE_FIELDS = ['id', 'avatarUrl', 'bio'] as const;
