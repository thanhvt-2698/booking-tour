import type { BookingStatus } from '../constants/booking.constants';

export interface AdminBookingFilters {
  createdFrom?: Date;
  createdTo?: Date;
  departureId?: string;
  status?: BookingStatus;
  tourId?: string;
  userId?: string;
}
