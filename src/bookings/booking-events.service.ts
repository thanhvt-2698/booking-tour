import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { BOOKING_STATUS_CHANGED_EVENT_NAME } from './constants/admin-booking.constants';
import type { BookingEventsPublisher } from './interfaces/booking-events.publisher.interface';
import type { BookingStatusChangedEvent } from './interfaces/booking-status-changed.interface';

@Injectable()
export class BookingEventsService implements BookingEventsPublisher {
  private readonly eventEmitter = new EventEmitter();

  onStatusChanged(listener: (event: BookingStatusChangedEvent) => void): void {
    this.eventEmitter.on(BOOKING_STATUS_CHANGED_EVENT_NAME, listener);
  }

  publishStatusChanged(event: BookingStatusChangedEvent): void {
    this.eventEmitter.emit(BOOKING_STATUS_CHANGED_EVENT_NAME, event);
  }
}
