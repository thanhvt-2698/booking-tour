export enum BookingStatus {
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

export const BOOKING_CODE_PREFIX = 'BT-';
export const BOOKING_CODE_RANDOM_PART_LENGTH = 24;
export const BOOKING_MAX_QUANTITY = 100;
export const IDEMPOTENCY_KEY_MAX_LENGTH = 100;
export const BOOKING_MONEY_DECIMAL_SEPARATOR = '.';
export const BOOKING_MONEY_FRACTION_DIGITS = 2;
export const BOOKING_MONEY_ZERO = '0';
export const BOOKING_MONEY_MINIMUM_DIGITS = BOOKING_MONEY_FRACTION_DIGITS + 1;

export const BOOKING_PUBLIC_FIELDS = [
  'id',
  'bookingCode',
  'departureId',
  'quantity',
  'unitPrice',
  'totalAmount',
  'currency',
  'status',
  'cancelReason',
  'createdAt',
  'updatedAt',
] as const;

export const BOOKING_QUERY_FIELDS = BOOKING_PUBLIC_FIELDS.map(
  (field) => `booking.${field}`,
);

export const BOOKING_DEPARTURE_QUERY_FIELDS = [
  'departure.id',
  'departure.tourId',
  'departure.status',
  'departure.startAt',
  'departure.bookingDeadline',
  'departure.capacity',
  'departure.bookedSeats',
];

export const BOOKING_SEAT_BALANCE_QUERY_FIELDS = [
  'departure.id',
  'departure.bookedSeats',
];

export const BOOKING_TOUR_FIELDS = ['basePrice', 'currency'] as const;
