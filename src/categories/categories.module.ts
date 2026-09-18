import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryEntity } from './entities/category.entity';

@Module({
  controllers: [AdminCategoriesController, CategoriesController],
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  providers: [CategoriesService, Logger],
  exports: [CategoriesService],
})
export class CategoriesModule {}
