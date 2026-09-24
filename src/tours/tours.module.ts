import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../categories/entities/category.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { AdminDeparturesController } from './admin-departures.controller';
import { AdminTourDeparturesController } from './admin-tour-departures.controller';
import { AdminToursController } from './admin-tours.controller';
import { DeparturesService } from './departures.service';
import { TourDepartureEntity } from './entities/tour-departure.entity';
import { TourEntity } from './entities/tour.entity';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

@Module({
  controllers: [
    AdminDeparturesController,
    AdminTourDeparturesController,
    AdminToursController,
    ToursController,
  ],
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      CategoryEntity,
      TourDepartureEntity,
      TourEntity,
    ]),
  ],
  providers: [DeparturesService, ToursService],
  exports: [DeparturesService, ToursService],
})
export class ToursModule {}
