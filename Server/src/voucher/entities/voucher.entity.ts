import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity/category.entity';
import { Brand } from '../../brand/entities/brand.entity/brand.entity';

export enum VoucherType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

@Entity()
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: VoucherType,
    default: VoucherType.FIXED,
  })
  type: VoucherType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ default: 0 })
  usageLimit: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(() => Category)
  @JoinTable({ name: 'voucher_categories' })
  applicableCategories: Category[];

  @ManyToMany(() => Brand)
  @JoinTable({ name: 'voucher_brands' })
  applicableBrands: Brand[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
