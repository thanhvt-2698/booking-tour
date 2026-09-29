import type { BookingStatus } from '../../bookings/constants/booking.constants';

export interface BookingStatusEmailTemplateInput {
  bookingCode: string;
  reason: string | null;
  recipientEmail: string;
  status: BookingStatus.APPROVED | BookingStatus.REJECTED;
}
