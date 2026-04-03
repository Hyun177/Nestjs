import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../product/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  orderId: number;

  @ManyToOne(() => Product)
  product: Product;

  @Column()
  productId: number;

  @Column({ nullable: true })
  shopId: number;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ nullable: true })
  size?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true })
  variantSku?: string;
}
