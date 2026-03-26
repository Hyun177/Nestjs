import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Voucher } from './voucher.entity';

@Entity('user_vouchers')
export class UserVoucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  voucherId: number;

  @ManyToOne(() => Voucher, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'voucherId' })
  voucher: Voucher;

  @Column({ default: 0 })
  usedCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
