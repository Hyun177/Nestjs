import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  price: number;
  @Column()
  description: string;
  @Column({ nullable: true })
  image?: string;
  @Column()
  category: string;
  @Column()
  brand: string;
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
  @Column()
  userId: number;
}
