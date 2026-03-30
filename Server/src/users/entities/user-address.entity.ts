import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  provinceCode: string;

  @Column()
  provinceName: string;

  @Column({ nullable: true })
  wardCode: string;

  @Column({ nullable: true })
  wardName: string;

  @Column()
  detail: string; // số nhà, tên đường

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
