import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { DepartureResponseDto } from '../dto/departure-response.dto';

export interface DepartureList {
  departures: DepartureResponseDto[];
  meta: PaginationMeta;
}
