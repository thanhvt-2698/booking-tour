import { UPLOAD_URL_PREFIX } from '../files/constants/file.constants';

export const fileStorageConfig = {
  publicUrlPrefix: UPLOAD_URL_PREFIX,
  folders: {
    tours: {
      isPublic: true,
      urlPrefix: `${UPLOAD_URL_PREFIX}tours/`,
    },
  },
} as const;
