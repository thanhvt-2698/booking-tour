import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateTourDto } from './update-tour.dto';
import { MAX_TOUR_IMAGE_COUNT } from '../../files/constants/file.constants';

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
