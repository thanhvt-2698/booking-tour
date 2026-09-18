import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { CategoryResponseDto } from '../dto/category-response.dto';

export interface CategoryList {
  categories: CategoryResponseDto[];
  meta: PaginationMeta;
}
