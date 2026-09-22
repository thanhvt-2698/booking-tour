import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TourEntity } from '../../tours/entities/tour.entity';
import { CategoryStatus } from '../constants/category.constants';

@Entity({ name: 'categories' })
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_categories_name_unique', { unique: true })
  @Column({ length: 100, type: 'varchar' })
  name!: string;

  @Index('IDX_categories_slug_unique', { unique: true })
  @Column({ length: 120, type: 'varchar' })
  slug!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({
    default: CategoryStatus.ACTIVE,
    enum: CategoryStatus,
    enumName: 'category_status_enum',
    type: 'enum',
  })
  status!: CategoryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TourEntity, (tour) => tour.category)
  tours!: TourEntity[];
}
