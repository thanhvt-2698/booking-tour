import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import { ReviewResponseDto } from './review-response.dto';

class ReviewPaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class ReviewListResponseDto {
  @ApiProperty({ type: ReviewPaginationMetaDto })
  meta!: PaginationMeta;

  @ApiProperty({ isArray: true, type: ReviewResponseDto })
  reviews!: ReviewResponseDto[];
}
