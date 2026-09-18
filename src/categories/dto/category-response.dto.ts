import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import { CategoryStatus } from '../constants/category.constants';

export class CategoryResponseDto {
  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: CategoryStatus })
  status!: CategoryStatus;

  @ApiProperty()
  updatedAt!: Date;
}

class CategoryPaginationMetaDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class CategoryListResponseDto {
  @ApiProperty({ isArray: true, type: CategoryResponseDto })
  categories!: CategoryResponseDto[];

  @ApiProperty({ type: CategoryPaginationMetaDto })
  meta!: PaginationMeta;
}
