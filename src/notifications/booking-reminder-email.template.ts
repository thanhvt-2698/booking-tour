import type { MailMessage } from './interfaces/mail-message.interface';
import type { BookingReminderEmailTemplateInput } from './interfaces/booking-reminder-email-template-input.interface';

export function createBookingReminderEmail(
  input: BookingReminderEmailTemplateInput,
  from: string,
): MailMessage {
  const departureTime = new Date(input.startAt).toISOString();

  return {
    from,
    subject: `Reminder: booking ${input.bookingCode} starts soon`,
    text: `Your tour for booking ${input.bookingCode} starts at ${departureTime}.`,
    to: input.recipientEmail,
  };
}
