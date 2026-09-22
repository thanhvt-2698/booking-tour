import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'refresh_tokens' })
@Index('IDX_refresh_tokens_user_id', ['userId'])
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.refreshTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    foreignKeyConstraintName: 'FK_refresh_tokens_user_id',
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user!: UserEntity;

  @Index('IDX_refresh_tokens_hash_unique', { unique: true })
  @Column({ length: 128, name: 'token_hash', type: 'varchar' })
  tokenHash!: string;

  @Index('IDX_refresh_tokens_family_id')
  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamptz' })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
