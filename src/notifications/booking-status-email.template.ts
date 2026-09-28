import { BookingStatus } from '../bookings/constants/booking.constants';
import type { MailMessage } from './interfaces/mail-message.interface';
import type { BookingStatusEmailTemplateInput } from './interfaces/booking-status-email-template-input.interface';

export function createBookingStatusEmail(
  input: BookingStatusEmailTemplateInput,
  from: string,
): MailMessage {
  if (input.status === BookingStatus.APPROVED) {
    return {
      from,
      subject: `Booking ${input.bookingCode} has been approved`,
      text: `Your booking ${input.bookingCode} has been approved.`,
      to: input.recipientEmail,
    };
  }

  return {
    from,
    subject: `Booking ${input.bookingCode} has been rejected`,
    text: input.reason
      ? `Your booking ${input.bookingCode} has been rejected. Reason: ${input.reason}`
      : `Your booking ${input.bookingCode} has been rejected.`,
    to: input.recipientEmail,
  };
}
