import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { BookingResponseDto } from '../dto/booking-response.dto';

export interface BookingList {
  bookings: BookingResponseDto[];
  meta: PaginationMeta;
}
