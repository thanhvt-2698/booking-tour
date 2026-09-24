import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingStatusHistoryEntity } from './entities/booking-status-history.entity';
import { BookingEntity } from './entities/booking.entity';

@Module({
  controllers: [BookingsController],
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingStatusHistoryEntity,
      TourDepartureEntity,
      TourEntity,
    ]),
  ],
  providers: [BookingsService],
})
export class BookingsModule {}
