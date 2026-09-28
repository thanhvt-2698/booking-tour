import type { PaginationMeta } from '../../common/dto/pagination-response.dto';
import type { AdminBookingResponseDto } from '../dto/admin-booking-response.dto';

export interface AdminBookingList {
  bookings: AdminBookingResponseDto[];
  meta: PaginationMeta;
}
