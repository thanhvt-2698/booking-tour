import { ApiProperty } from '@nestjs/swagger';
import {
  IMAGE_FILE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  IMAGE_STORAGE_KEY_SEPARATOR,
} from '../../files/constants/file.constants';
import { DEFAULT_API_PREFIX } from '../../common/constants/app.constants';
import {
  FIRST_REVIEW_IMAGE_SORT_ORDER,
  REVIEW_IMAGE_ROUTE_NAME,
} from '../constants/review.constants';

export class ReviewImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: IMAGE_MIME_TYPES.jpeg })
  mimeType!: string;

  @ApiProperty({ example: 'photo.jpg' })
  originalName!: string;

  @ApiProperty({ example: 123456 })
  sizeBytes!: number;

  @ApiProperty({ example: FIRST_REVIEW_IMAGE_SORT_ORDER })
  sortOrder!: number;

  @ApiProperty({
    example: `${IMAGE_STORAGE_KEY_SEPARATOR}${DEFAULT_API_PREFIX}${IMAGE_STORAGE_KEY_SEPARATOR}${REVIEW_IMAGE_ROUTE_NAME}${IMAGE_STORAGE_KEY_SEPARATOR}image${IMAGE_FILE_EXTENSIONS.jpg}`,
  })
  url!: string;
}
