import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../categories/entities/category.entity';
import { AdminToursController } from './admin-tours.controller';
import { TourEntity } from './entities/tour.entity';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

@Module({
  controllers: [AdminToursController, ToursController],
  imports: [TypeOrmModule.forFeature([CategoryEntity, TourEntity])],
  providers: [ToursService],
  exports: [ToursService],
})
export class ToursModule {}
