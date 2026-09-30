import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTourDto } from './create-tour.dto';
import { MAX_TOUR_IMAGE_COUNT } from '../../files/constants/file.constants';

export class CreateTourWithImagesDto extends CreateTourDto {
  @ApiPropertyOptional({
    description: 'Up to 10 tour images',
    type: 'array',
    maxItems: MAX_TOUR_IMAGE_COUNT,
    items: { type: 'string', format: 'binary' },
  })
  images?: unknown[];
}
