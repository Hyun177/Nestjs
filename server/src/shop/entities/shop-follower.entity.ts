import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shop } from './shop.entity';

@Entity('shop_followers')
export class ShopFollower {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @ManyToOne(() => Shop)
  @JoinColumn({ name: 'shopId' })
  shop!: Shop;

  @Column()
  shopId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
