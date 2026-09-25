import type { BookingStatusChangedEvent } from './booking-status-changed.interface';

export interface BookingEventsPublisher {
  onStatusChanged(listener: (event: BookingStatusChangedEvent) => void): void;
  publishStatusChanged(event: BookingStatusChangedEvent): void;
}
