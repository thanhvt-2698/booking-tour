export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const FILE_NOT_FOUND_CODE = 'ENOENT';
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_ORIGINAL_NAME_LENGTH = 255;
export const MAX_IMAGE_STORAGE_KEY_LENGTH = 255;
export const MAX_IMAGE_PUBLIC_URL_LENGTH = 2048;
export const MAX_IMAGE_MIME_TYPE_LENGTH = 100;
export const UPLOAD_DIRECTORY_NAME = 'uploads';
export const UPLOAD_URL_PREFIX = '/uploads/';
export const IMAGE_UPLOAD_FIELD_NAME = 'images';
export const IMAGE_UPLOAD_REQUEST_CONTENT_TYPES = [
  'multipart/form-data',
  'application/json',
] as const;

export const IMAGE_FILE_EXTENSIONS = {
  jpg: '.jpg',
  jpeg: '.jpeg',
  png: '.png',
  webp: '.webp',
} as const;

export const IMAGE_MIME_TYPES = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export const IMAGE_MIME_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  [IMAGE_FILE_EXTENSIONS.jpg]: IMAGE_MIME_TYPES.jpeg,
  [IMAGE_FILE_EXTENSIONS.jpeg]: IMAGE_MIME_TYPES.jpeg,
  [IMAGE_FILE_EXTENSIONS.png]: IMAGE_MIME_TYPES.png,
  [IMAGE_FILE_EXTENSIONS.webp]: IMAGE_MIME_TYPES.webp,
};

const MANAGED_IMAGE_EXTENSION_PATTERN = Object.values(IMAGE_FILE_EXTENSIONS)
  .map((extension) => extension.slice(1))
  .join('|');

export const MANAGED_IMAGE_NAME_PATTERN = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:${MANAGED_IMAGE_EXTENSION_PATTERN})$`,
);

export const IMAGE_SIGNATURE_START_OFFSET = 0;
export const WEBP_FORMAT_SIGNATURE_OFFSET = 8;
export const EXPECTED_IMAGE_STORAGE_KEY_SEGMENT_COUNT = 2;
export const IMAGE_STORAGE_KEY_SEPARATOR = '/';
export const MINIMUM_IMAGE_SIZE_BYTES = 1;
export const FILE_WRITE_FLAG_NO_OVERWRITE = 'wx';
export const IMAGE_FILENAME_FORBIDDEN_CHARACTERS = ['/', '\\', '\0'] as const;

export const IMAGE_FILE_SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [137, 80, 78, 71, 13, 10, 26, 10],
  webpRiff: 'RIFF',
  webpFormat: 'WEBP',
} as const;

export const FILE_STORAGE_ERROR_KEYS = {
  invalidImage: 'errors.imageInvalid',
  tooManyImages: 'errors.imageCountExceeded',
  invalidImageKey: 'errors.imageKeyInvalid',
} as const;

export const FILE_STORAGE_LOG_EVENTS = {
  cleanupFailed: 'image_cleanup_failed',
} as const;

export const UNKNOWN_ERROR_NAME = 'UnknownError';
