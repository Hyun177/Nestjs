import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Shop } from '../../shop/entities/shop.entity';
import { Product } from '../../product/entities/product.entity';

@Entity('shop_categories')
export class ShopCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Shop)
  @JoinColumn({ name: 'shopId' })
  shop!: Shop;

  @Column()
  shopId!: number;

  @Column()
  name!: string;

  @Column({ default: 0 })
  sortOrder!: number;

  @Column({ default: false })
  isHidden!: boolean;

  @ManyToMany(() => Product, (product) => product.shopCategories)
  products!: Product[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
