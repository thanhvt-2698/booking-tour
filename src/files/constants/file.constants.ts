export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const FILE_NOT_FOUND_CODE = 'ENOENT';
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_ORIGINAL_NAME_LENGTH = 255;
export const MAX_TOUR_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_BYTES;
export const UPLOAD_DIRECTORY_NAME = 'uploads';
export const UPLOAD_URL_PREFIX = '/uploads/';

export const TOUR_IMAGE_MIME_TYPES = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;
