import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity/category.entity';
import { Brand } from '../../brand/entities/brand.entity/brand.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  price: number;

  @Column({ nullable: true })
  originalPrice?: number;

  @Column()
  description: string;
  @Column({ nullable: true })
  image?: string;
  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;
  @Column()
  categoryId: number;
  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brandId' })
  brand: Brand;
  @Column()
  brandId: number;
  @Column({ default: 0 })
  stock: number;
  @Column({ default: 0, type: 'decimal', precision: 3, scale: 2 })
  rating: number;
  @Column({ default: 0 })
  numReviews: number;
  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ type: 'json', nullable: true })
  labels?: string[];

  @Column({ type: 'json', nullable: true })
  specs?: { icon: string; text: string }[];

  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ type: 'json', nullable: true })
  attributes?: { name: string; options: string[] }[];

  @Column({ type: 'json', nullable: true })
  variants?: { 
    sku: string; 
    price: number; 
    stock: number; 
    attributes: { [key: string]: string } 
  }[];

  @Column({ nullable: true })
  promoNote?: string;

  @Column({ default: 0 })
  soldCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
