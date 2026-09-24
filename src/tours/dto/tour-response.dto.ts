import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import { TourStatus } from '../constants/tour.constants';

export class TourResponseDto {
  @ApiProperty()
  basePrice!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: TourStatus })
  status!: TourStatus;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  updatedAt!: Date;
}

class TourPaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class TourListResponseDto {
  @ApiProperty({ isArray: true, type: TourResponseDto })
  tours!: TourResponseDto[];

  @ApiProperty({ type: TourPaginationMetaDto })
  meta!: PaginationMeta;
}
