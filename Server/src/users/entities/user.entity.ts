import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { Order } from '../../order/entities/order.entity';
import { Shop } from '../../shop/entities/shop.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  firstname: string;

  @Column({ nullable: true })
  lastname: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ default: 'active' })
  status: string; // active, blocked, inactive

  @ManyToMany(() => Role, (role) => role.users)
  roles: Role[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToOne(() => Shop, (shop) => shop.user)
  shop: Shop;
}
