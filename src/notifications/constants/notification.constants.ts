import { DepartureStatus } from '../../tours/constants/departure.constants';

export enum BookingNotificationOutboxKind {
  REMINDER = 'reminder',
  STATUS = 'status',
}

export enum BookingNotificationDeliveryStatus {
  SENT = 'sent',
  SKIPPED = 'skipped',
}

export const BOOKING_NOTIFICATION_QUEUE = 'booking-notification';
export const BOOKING_NOTIFICATION_QUEUE_PREFIX = 'booking-tour';
export const BOOKING_NOTIFICATION_TEST_QUEUE_PREFIX = 'booking-tour-test';
export const BOOKING_STATUS_NOTIFICATION_JOB = 'booking-status-notification';
export const BOOKING_REMINDER_NOTIFICATION_JOB =
  'booking-reminder-notification';
export const BOOKING_NOTIFICATION_MAX_ATTEMPTS = 3;
export const BOOKING_NOTIFICATION_BACKOFF_DELAY_MS = 1_000;
export const BOOKING_NOTIFICATION_JOB_ID_PREFIX = 'booking-status';
export const BOOKING_REMINDER_NOTIFICATION_JOB_ID_PREFIX = 'booking-reminder';
export const BOOKING_NOTIFICATION_OUTBOX_BATCH_SIZE = 100;
export const BOOKING_NOTIFICATION_OUTBOX_DEDUPE_KEY_SEPARATOR = ':';
export const BOOKING_NOTIFICATION_JOB_FIELDS = {
  status: 'status',
  startAt: 'startAt',
} as const;
export const BOOKING_NOTIFICATION_ELIGIBLE_DEPARTURE_STATUSES = [
  DepartureStatus.OPEN,
  DepartureStatus.CLOSED,
] as const;
export const BOOKING_NOTIFICATION_BLOCKING_JOB_STATES = new Set<string>([
  'active',
  'delayed',
  'failed',
  'paused',
  'stuck',
  'waiting',
]);
export const BOOKING_NOTIFICATION_DISPATCH_FAILED_EVENT =
  'booking_notification_dispatch_failed';
export const BOOKING_NOTIFICATION_FAILED_EVENT = 'booking_notification_failed';
export const BOOKING_NOTIFICATION_RETRY_COMMAND_FAILED_EVENT =
  'booking_notification_retry_command_failed';
export const BOOKING_NOTIFICATION_RETRIED_EVENT =
  'booking_notification_failed_jobs_retried';
export const NOTIFICATION_MAIL_SENDER = 'NOTIFICATION_MAIL_SENDER';
export const SMTP_TLS_PORT = 465;
export const MAIL_ENABLED_CONFIG_KEY = 'MAIL_ENABLED';
export const MAIL_FROM_CONFIG_KEY = 'MAIL_FROM';
export const MAIL_HOST_CONFIG_KEY = 'MAIL_HOST';
export const MAIL_CREDENTIAL_CONFIG_KEY = 'MAIL_PASSWORD';
export const MAIL_PORT_CONFIG_KEY = 'MAIL_PORT';
export const MAIL_USER_CONFIG_KEY = 'MAIL_USER';
export const REDIS_HOST_CONFIG_KEY = 'REDIS_HOST';
export const REDIS_CREDENTIAL_CONFIG_KEY = 'REDIS_PASSWORD';
export const REDIS_PORT_CONFIG_KEY = 'REDIS_PORT';
export const NODE_ENV_CONFIG_KEY = 'NODE_ENV';
export const TEST_NODE_ENVIRONMENT = 'test';

export const BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS = [
  'booking.id',
  'booking.bookingCode',
  'booking.userId',
  'user.email',
];

export const BOOKING_NOTIFICATION_REMINDER_QUERY_FIELDS = [
  'booking.id',
  'booking.userId',
  'booking.status',
  'departure.startAt',
  'departure.status',
];

export const BOOKING_NOTIFICATION_REMINDER_PROCESSOR_QUERY_FIELDS = [
  'booking.id',
  'booking.bookingCode',
  'booking.userId',
  'booking.status',
  'user.email',
  'departure.startAt',
  'departure.status',
];

export const BOOKING_NOTIFICATION_OUTBOX_PENDING_QUERY_FIELDS = [
  'outbox.id',
  'outbox.bookingId',
  'outbox.recipientUserId',
  'outbox.kind',
  'outbox.status',
  'outbox.reason',
  'outbox.startAt',
  'outbox.deduplicationKey',
  'outbox.lastCheckedAt',
  'outbox.processedAt',
];

export const BOOKING_NOTIFICATION_OUTBOX_PROCESSOR_QUERY_FIELDS = [
  ...BOOKING_NOTIFICATION_OUTBOX_PENDING_QUERY_FIELDS,
  'outbox.deliveryStatus',
];
