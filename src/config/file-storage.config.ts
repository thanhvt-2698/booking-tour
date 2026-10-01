import 'dotenv/config';
import { DEFAULT_API_PREFIX } from '../common/constants/app.constants';
import {
  IMAGE_STORAGE_KEY_SEPARATOR,
  UPLOAD_URL_PREFIX,
} from '../files/constants/file.constants';
import { TOUR_IMAGE_FOLDER_NAME } from '../tours/constants/tour.constants';
import { AVATAR_IMAGE_FOLDER_NAME } from '../users/constants/user.constants';
import {
  REVIEW_IMAGE_FOLDER_NAME,
  REVIEW_IMAGE_ROUTE_NAME,
} from '../reviews/constants/review.constants';

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
    [REVIEW_IMAGE_FOLDER_NAME]: {
      // Review image visibility is enforced by its download controller.
      isPublic: false,
      urlPrefix: `${IMAGE_STORAGE_KEY_SEPARATOR}${process.env.API_PREFIX ?? DEFAULT_API_PREFIX}${IMAGE_STORAGE_KEY_SEPARATOR}${REVIEW_IMAGE_ROUTE_NAME}${IMAGE_STORAGE_KEY_SEPARATOR}`,
    },
    [TOUR_IMAGE_FOLDER_NAME]: {
      isPublic: true,
      urlPrefix: `${UPLOAD_URL_PREFIX}${TOUR_IMAGE_FOLDER_NAME}${IMAGE_STORAGE_KEY_SEPARATOR}`,
    },
  },
} as const;
