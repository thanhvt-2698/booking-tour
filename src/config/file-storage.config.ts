import { UPLOAD_URL_PREFIX } from '../files/constants/file.constants';

export const fileStorageConfig = {
  // Review images are served by their controller to enforce visibility rules.
  publicFolders: ['avatars', 'tours'],
  publicUrlPrefix: UPLOAD_URL_PREFIX,
} as const;
