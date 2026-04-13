import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, default: 'user' })
  name!: string;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({ name: 'role_permission' }) // bảng trung gian role_permission
  permissions!: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  @JoinTable({ name: 'user_role' }) // bảng trung gian user_role
  users!: User[];
}
