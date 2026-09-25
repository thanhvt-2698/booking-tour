export const ADMIN_BOOKING_REASON_MAX_LENGTH = 500;
export const ADMIN_BOOKING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const ADMIN_BOOKING_NEXT_CALENDAR_DAY_OFFSET = 1;
export const ADMIN_BOOKING_UTC_DAY_START_SUFFIX = 'T00:00:00.000Z';
export const BOOKING_STATUS_CHANGED_EVENT_NAME = 'booking.status.changed';

export const ADMIN_BOOKING_QUERY_FIELDS = [
  'booking.id',
  'booking.bookingCode',
  'booking.departureId',
  'booking.quantity',
  'booking.unitPrice',
  'booking.totalAmount',
  'booking.currency',
  'booking.status',
  'booking.cancelReason',
  'booking.createdAt',
  'booking.updatedAt',
];

export const ADMIN_BOOKING_ACTION_QUERY_FIELDS = [
  'booking.id',
  'booking.departureId',
  'booking.quantity',
  'booking.status',
  'booking.cancelReason',
];

export const ADMIN_BOOKING_USER_QUERY_FIELDS = ['user.id', 'user.email'];

export const ADMIN_BOOKING_DEPARTURE_QUERY_FIELDS = [
  'departure.id',
  'departure.tourId',
  'departure.startAt',
  'departure.endAt',
  'departure.status',
  'departure.capacity',
  'departure.bookedSeats',
];

export const ADMIN_BOOKING_DEPARTURE_ACTION_QUERY_FIELDS = [
  'departure.id',
  'departure.bookedSeats',
];

export const ADMIN_BOOKING_TOUR_QUERY_FIELDS = [
  'tour.id',
  'tour.code',
  'tour.title',
];
