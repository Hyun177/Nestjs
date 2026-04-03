import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  // Buyer
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: number;

  // Seller (owner of the shop)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  sellerId: number;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @Column({ nullable: true, type: 'text' })
  lastMessage: string;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ default: 0 })
  unreadBuyer: number;   // unread count for buyer

  @Column({ default: 0 })
  unreadSeller: number;  // unread count for seller

  @CreateDateColumn()
  createdAt: Date;
}
