import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewsStore } from './reviews.store';

@Module({
  controllers: [ReviewsController],
  imports: [
    TypeOrmModule.forFeature([BookingEntity, ReviewEntity, TourEntity]),
  ],
  providers: [ReviewsService, ReviewsStore],
})
export class ReviewsModule {}
