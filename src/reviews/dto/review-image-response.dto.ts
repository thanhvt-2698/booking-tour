import { ApiProperty } from '@nestjs/swagger';

export class ReviewImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ example: 'photo.jpg' })
  originalName!: string;

  @ApiProperty({ example: 123456 })
  sizeBytes!: number;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: '/uploads/reviews/image.jpg' })
  url!: string;
}
