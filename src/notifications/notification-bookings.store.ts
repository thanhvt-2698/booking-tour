import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { BookingEntity } from '../bookings/entities/booking.entity';
import {
  BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS,
  BOOKING_NOTIFICATION_QUERY_FIELDS,
} from './constants/notification.constants';
import type { BookingNotificationDelivery } from './interfaces/booking-notification-delivery.interface';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import type { BookingNotificationRecipient } from './interfaces/booking-notification-recipient.interface';

@Injectable()
export class NotificationBookingsStore {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
  ) {}

  async findRecipient(
    bookingId: string,
  ): Promise<BookingNotificationRecipient | null> {
    const booking = await this.bookingsRepository.findOne({
      select: BOOKING_NOTIFICATION_QUERY_FIELDS,
      where: { id: bookingId },
    });

    return booking
      ? { bookingId: booking.id, recipientUserId: booking.userId }
      : null;
  }

  async findDelivery(
    job: BookingNotificationJob,
  ): Promise<BookingNotificationDelivery | null> {
    const booking = await this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.user', 'user')
      .select(BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS)
      .where('booking.id = :bookingId', { bookingId: job.bookingId })
      .andWhere('booking.user_id = :recipientUserId', {
        recipientUserId: job.recipientUserId,
      })
      .getOne();

    return booking
      ? {
          bookingCode: booking.bookingCode,
          recipientEmail: booking.user.email,
        }
      : null;
  }
}
