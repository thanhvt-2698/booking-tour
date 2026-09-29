import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsModule } from '../bookings/bookings.module';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingNotificationProcessor } from './booking-notification.processor';
import {
  BOOKING_NOTIFICATION_QUEUE,
  BOOKING_NOTIFICATION_QUEUE_PREFIX,
  BOOKING_NOTIFICATION_TEST_QUEUE_PREFIX,
  NODE_ENV_CONFIG_KEY,
  NOTIFICATION_MAIL_SENDER,
  REDIS_HOST_CONFIG_KEY,
  REDIS_CREDENTIAL_CONFIG_KEY,
  REDIS_PORT_CONFIG_KEY,
  TEST_NODE_ENVIRONMENT,
} from './constants/notification.constants';
import { MailService } from './mail.service';
import { NotificationBookingsStore } from './notification-bookings.store';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    BookingsModule,
    ConfigModule,
    TypeOrmModule.forFeature([BookingEntity]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        prefix:
          configService.getOrThrow<string>(NODE_ENV_CONFIG_KEY) ===
          TEST_NODE_ENVIRONMENT
            ? BOOKING_NOTIFICATION_TEST_QUEUE_PREFIX
            : BOOKING_NOTIFICATION_QUEUE_PREFIX,
        redis: {
          host: configService.getOrThrow<string>(REDIS_HOST_CONFIG_KEY),
          password:
            configService.getOrThrow<string>(REDIS_CREDENTIAL_CONFIG_KEY) ||
            undefined,
          port: configService.getOrThrow<number>(REDIS_PORT_CONFIG_KEY),
        },
      }),
    }),
    BullModule.registerQueue({ name: BOOKING_NOTIFICATION_QUEUE }),
  ],
  providers: [
    BookingNotificationProcessor,
    MailService,
    NotificationBookingsStore,
    NotificationsService,
    { provide: NOTIFICATION_MAIL_SENDER, useExisting: MailService },
  ],
})
export class NotificationsModule {}
