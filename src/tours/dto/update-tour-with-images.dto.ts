import { ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_TOUR_IMAGE_COUNT } from '../constants/tour.constants';
import { UpdateTourDto } from './update-tour.dto';

export class UpdateTourWithImagesDto extends UpdateTourDto {
  @ApiPropertyOptional({
    description:
      'New tour images; existing images are kept unless removeImageIds is supplied',
    type: 'array',
    maxItems: MAX_TOUR_IMAGE_COUNT,
    items: { type: 'string', format: 'binary' },
  })
  images?: unknown[];
}
