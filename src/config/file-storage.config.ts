import {
  IMAGE_STORAGE_KEY_SEPARATOR,
  TOUR_IMAGE_FOLDER_NAME,
  UPLOAD_URL_PREFIX,
} from '../files/constants/file.constants';
import { AVATAR_IMAGE_FOLDER_NAME } from '../users/constants/user.constants';

export const fileStorageConfig = {
  publicUrlPrefix: UPLOAD_URL_PREFIX,
  publicServingOptions: {
    dotfiles: 'deny',
    index: false,
  },
  folders: {
    [AVATAR_IMAGE_FOLDER_NAME]: {
      isPublic: true,
      urlPrefix: `${UPLOAD_URL_PREFIX}${AVATAR_IMAGE_FOLDER_NAME}${IMAGE_STORAGE_KEY_SEPARATOR}`,
    },
    [TOUR_IMAGE_FOLDER_NAME]: {
      isPublic: true,
      urlPrefix: `${UPLOAD_URL_PREFIX}${TOUR_IMAGE_FOLDER_NAME}${IMAGE_STORAGE_KEY_SEPARATOR}`,
    },
  },
} as const;
