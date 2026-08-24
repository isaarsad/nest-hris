import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity.js';

@Entity('refresh_tokens')
export class RefreshTokenOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index('idx_refresh_tokens_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index('idx_refresh_tokens_token_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Index('idx_refresh_tokens_expires_at')
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Index('idx_refresh_tokens_absolute_expires_at')
  @Column({ name: 'absolute_expires_at', type: 'timestamptz' })
  absoluteExpiresAt!: Date;

  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
  })
  revokedAt!: Date | null;

  @Column({
    name: 'replaced_by_token_id',
    type: 'uuid',
    nullable: true,
  })
  replacedByTokenId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
}
