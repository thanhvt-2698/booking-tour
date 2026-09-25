import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingsStore } from './admin-bookings.store';
import { AdminBookingsService } from './admin-bookings.service';
import { BookingEventsService } from './booking-events.service';
import { BookingStatusHistoryEntity } from './entities/booking-status-history.entity';
import { BookingEntity } from './entities/booking.entity';

@Module({
  controllers: [AdminBookingsController, BookingsController],
  exports: [BookingEventsService],
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingStatusHistoryEntity,
      TourDepartureEntity,
      TourEntity,
    ]),
  ],
  providers: [
    AdminBookingsStore,
    AdminBookingsService,
    BookingEventsService,
    BookingsService,
  ],
})
export class BookingsModule {}
