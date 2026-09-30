import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TourEntity } from '../tours/entities/tour.entity';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewEntity } from './entities/review.entity';
import { PublicReviewsController } from './public-reviews.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [
    PublicReviewsController,
    ReviewsController,
    AdminReviewsController,
  ],
  imports: [TypeOrmModule.forFeature([ReviewEntity, TourEntity])],
  providers: [ReviewsService],
})
export class ReviewsModule {}
