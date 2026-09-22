export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const MAX_TOUR_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const TOUR_IMAGE_MIME_TYPES = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;
