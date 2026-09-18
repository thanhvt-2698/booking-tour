import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { TourResponseDto } from '../dto/tour-response.dto';

export interface TourList {
  meta: PaginationMeta;
  tours: TourResponseDto[];
}
