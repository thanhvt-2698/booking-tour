import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { AdminReviewResponseDto } from '../dto/admin-review-response.dto';

export interface AdminReviewList {
  meta: PaginationMeta;
  reviews: AdminReviewResponseDto[];
}
