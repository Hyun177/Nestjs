import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UserAddress } from './entities/user-address.entity';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';

@Module({
  controllers: [UsersController, AddressController],
  providers: [UsersService, AddressService],
  imports: [TypeOrmModule.forFeature([User, Role, UserAddress])],
  exports: [AddressService, UsersService],
})
export class UsersModule {}
