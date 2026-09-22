import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'social_accounts' })
@Index(
  'IDX_social_accounts_provider_account_unique',
  ['provider', 'providerAccountId'],
  { unique: true },
)
@Index('IDX_social_accounts_user_id', ['userId'])
export class SocialAccountEntity {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255, name: 'provider_account_id', type: 'varchar' })
  providerAccountId!: string;

  @Column({ length: 30, type: 'varchar' })
  provider!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.socialAccounts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_social_accounts_user',
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user!: UserEntity;
}
