import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReviewEntity } from './review.entity';

@Entity({ name: 'review_images' })
@Index('IDX_review_images_review_sort', ['reviewId', 'sortOrder', 'id'])
export class ReviewImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId!: string;

  @ManyToOne(() => ReviewEntity, (review) => review.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_review_images_review',
    name: 'review_id',
    referencedColumnName: 'id',
  })
  review!: ReviewEntity;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  @Index('IDX_review_images_storage_key_unique', { unique: true })
  @Column({ name: 'storage_key', length: 255, type: 'varchar' })
  storageKey!: string;

  @Column({ length: 2048, type: 'varchar' })
  url!: string;

  @Column({ name: 'mime_type', length: 100, type: 'varchar' })
  mimeType!: string;

  @Column({ name: 'original_name', length: 255, type: 'varchar' })
  originalName!: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
