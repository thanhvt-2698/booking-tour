import { DepartureStatus } from '../../tours/constants/departure.constants';

export const SCHEDULER_ENABLED_CONFIG_KEY = 'SCHEDULER_ENABLED';
export const SCHEDULER_BATCH_SIZE_CONFIG_KEY = 'SCHEDULER_BATCH_SIZE';
export const BOOKING_PENDING_TTL_HOURS_CONFIG_KEY = 'BOOKING_PENDING_TTL_HOURS';
export const SCHEDULER_NODE_ENV_CONFIG_KEY = 'NODE_ENV';

export const DEFAULT_SCHEDULER_BATCH_SIZE = 100;
export const DEFAULT_BOOKING_PENDING_TTL_HOURS = 24;
export const DEFAULT_SCHEDULER_ENABLED_OUTSIDE_TEST = true;
export const BOOKING_REMINDER_LEAD_HOURS = 24;
export const TEST_NODE_ENVIRONMENT = 'test';
export const MILLISECONDS_PER_SECOND = 1_000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const MILLISECONDS_PER_HOUR =
  MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

export const SCHEDULER_CRON_EXPRESSION = '* * * * *';
export const SCHEDULER_CRON_JOB_NAME = 'booking-tour-scheduler';
export const SCHEDULER_BATCH_LOG_EVENT = 'scheduler_batch_completed';
export const SCHEDULER_FAILURE_LOG_EVENT = 'scheduler_run_failed';
export const SCHEDULER_BOOKING_EXPIRY_FAILURE_LOG_EVENT =
  'scheduler_booking_expiry_failed';
export const SCHEDULER_BOOKING_REMINDER_FAILURE_LOG_EVENT =
  'scheduler_booking_reminder_failed';
export const SCHEDULER_UNKNOWN_ERROR_NAME = 'UnknownError';
export const SCHEDULER_BOOKING_ID_CURSOR_CONDITION =
  'booking.id > :afterBookingId';
export const SCHEDULER_BOOKING_ID_ORDER_FIELD = 'booking.id';

export const BOOKING_PENDING_EXPIRY_REASON =
  'Pending booking expired after the approval waiting period';

export const SCHEDULER_OPEN_DEPARTURE_QUERY_FIELDS = ['departure.id'];
export const SCHEDULER_COMPLETABLE_DEPARTURE_QUERY_FIELDS = ['departure.id'];
export const SCHEDULER_PENDING_BOOKING_QUERY_FIELDS = ['booking.id'];
export const SCHEDULER_REMINDER_QUERY_FIELDS = [
  'booking.id',
  'departure.id',
  'departure.startAt',
];
export const SCHEDULER_BOOKING_LOCK_QUERY_FIELDS = [
  'booking.id',
  'booking.createdAt',
  'booking.departureId',
  'booking.quantity',
  'booking.status',
];
export const SCHEDULER_DEPARTURE_LOCK_QUERY_FIELDS = [
  'departure.id',
  'departure.bookedSeats',
];
export const SCHEDULER_REMINDER_ELIGIBLE_DEPARTURE_STATUSES = [
  DepartureStatus.OPEN,
  DepartureStatus.CLOSED,
];
