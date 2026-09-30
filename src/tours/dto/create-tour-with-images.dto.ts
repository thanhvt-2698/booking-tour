import { ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_TOUR_IMAGE_COUNT } from '../constants/tour.constants';
import { CreateTourDto } from './create-tour.dto';

export class CreateTourWithImagesDto extends CreateTourDto {
  @ApiPropertyOptional({
    description: `Up to ${MAX_TOUR_IMAGE_COUNT} tour images`,
    type: 'array',
    maxItems: MAX_TOUR_IMAGE_COUNT,
    items: { type: 'string', format: 'binary' },
  })
  images?: unknown[];
}
