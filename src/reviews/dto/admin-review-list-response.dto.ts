import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import { AdminReviewResponseDto } from './admin-review-response.dto';

class AdminReviewPaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class AdminReviewListResponseDto {
  @ApiProperty({ type: AdminReviewPaginationMetaDto })
  meta!: PaginationMeta;

  @ApiProperty({ isArray: true, type: AdminReviewResponseDto })
  reviews!: AdminReviewResponseDto[];
}
