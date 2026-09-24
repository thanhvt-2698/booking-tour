export enum DepartureStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum DepartureUpdateStatus {
  OPEN = DepartureStatus.OPEN,
  CLOSED = DepartureStatus.CLOSED,
}

export const DEPARTURE_PUBLIC_FIELDS = [
  'id',
  'tourId',
  'status',
  'startAt',
  'endAt',
  'bookingDeadline',
  'capacity',
  'bookedSeats',
  'createdAt',
  'updatedAt',
] as const;

export const DEPARTURE_QUERY_FIELDS = DEPARTURE_PUBLIC_FIELDS.map(
  (field) => `departure.${field}`,
);

export const ISO_DATETIME_WITH_TIMEZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
