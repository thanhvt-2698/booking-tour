import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingStatusHistoryEntity } from '../bookings/entities/booking-status-history.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import { SchedulerCronService } from './scheduler-cron.service';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingStatusHistoryEntity,
      TourDepartureEntity,
    ]),
    NotificationsModule,
  ],
  exports: [SchedulerService],
  providers: [SchedulerCronService, SchedulerService],
})
export class SchedulerModule {}
