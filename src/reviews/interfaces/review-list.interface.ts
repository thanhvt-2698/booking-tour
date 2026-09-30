import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { ReviewResponseDto } from '../dto/review-response.dto';

export interface ReviewList {
  meta: PaginationMeta;
  reviews: ReviewResponseDto[];
}
