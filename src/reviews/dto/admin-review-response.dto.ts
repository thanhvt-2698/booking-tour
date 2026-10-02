import { ApiProperty } from '@nestjs/swagger';
import { ReviewResponseDto } from './review-response.dto';

export class AdminReviewResponseDto extends ReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;
}
