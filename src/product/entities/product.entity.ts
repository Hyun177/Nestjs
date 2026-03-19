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
  @Column()
  image: string;
  @Column()
  category: string;
  @Column()
  brand: string;
  @Column()
  stock: number;
  @Column()
  rating: number;
  @Column()
  numReviews: number;
  @Column()
  isFeatured: boolean;
  @Column()
  isArchived: boolean;
  @Column()
  userId: number;
}
