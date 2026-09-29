import { BookingStatus } from '../bookings/constants/booking.constants';
import { createBookingStatusEmail } from './booking-status-email.template';

describe('createBookingStatusEmail', () => {
  it('formats an approval message', () => {
    expect(
      createBookingStatusEmail(
        {
          bookingCode: 'BT-APPROVED',
          reason: null,
          recipientEmail: 'traveler@example.com',
          status: BookingStatus.APPROVED,
        },
        'no-reply@example.com',
      ),
    ).toMatchObject({
      subject: 'Booking BT-APPROVED has been approved',
      text: 'Your booking BT-APPROVED has been approved.',
    });
  });

  it('formats a rejection message with its reason', () => {
    expect(
      createBookingStatusEmail(
        {
          bookingCode: 'BT-REJECTED',
          reason: 'Missing required information',
          recipientEmail: 'traveler@example.com',
          status: BookingStatus.REJECTED,
        },
        'no-reply@example.com',
      ),
    ).toMatchObject({
      subject: 'Booking BT-REJECTED has been rejected',
      text: 'Your booking BT-REJECTED has been rejected. Reason: Missing required information',
    });
  });
});
