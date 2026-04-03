import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerRequestService } from './seller-request.service';
import { SellerRequestController } from './seller-request.controller';
import { SellerRequest } from './entities/seller-request.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { Shop } from '../shop/entities/shop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SellerRequest, User, Role, Shop])],
  controllers: [SellerRequestController],
  providers: [SellerRequestService],
  exports: [SellerRequestService],
})
export class SellerRequestModule {}
