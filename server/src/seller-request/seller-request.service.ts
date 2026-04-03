import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerRequest, RequestStatus } from './entities/seller-request.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { Shop } from '../shop/entities/shop.entity';

@Injectable()
export class SellerRequestService {
  constructor(
    @InjectRepository(SellerRequest)
    private sellerRequestRepository: Repository<SellerRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
  ) {}

  async create(userId: number, createDto: any) {
    // Check if user already has a pending or approved request
    const existing = await this.sellerRequestRepository.findOne({
      where: [
        { userId, status: RequestStatus.PENDING },
        { userId, status: RequestStatus.APPROVED },
      ],
    });

    if (existing) {
      throw new BadRequestException('You already have a pending or approved seller request.');
    }

    const request = this.sellerRequestRepository.create({
      ...createDto,
      userId,
    });

    return this.sellerRequestRepository.save(request);
  }

  async findAll() {
    return this.sellerRequestRepository.find({ relations: ['user'] });
  }

  async findMyRequest(userId: number) {
    return this.sellerRequestRepository.find({ where: { userId } });
  }

  async approve(id: number) {
    const request = await this.sellerRequestRepository.findOne({
      where: { id },
      relations: ['user', 'user.roles'],
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is already ' + request.status);
    }

    // 1. Update request status
    request.status = RequestStatus.APPROVED;
    await this.sellerRequestRepository.save(request);

    // 2. Add SELLER role to user
    const sellerRole = await this.roleRepository.findOne({ 
      where: { name: 'seller' } 
    });
    
    if (sellerRole) {
      const user = await this.userRepository.findOne({ 
        where: { id: request.userId }, 
        relations: ['roles'] 
      });
      
      if (user && !user.roles.some((r) => r.name === 'seller')) {
        user.roles = [...user.roles, sellerRole];
        await this.userRepository.save(user);
        console.log(`Successfully added SELLER role to user ${user.id}`);
      }
    }

    // 3. Create shop
    const shop = this.shopRepository.create({
      userId: request.userId,
      name: request.shopName,
      description: request.description,
      logo: request.logo,
    });

    await this.shopRepository.save(shop);

    return { message: 'Seller request approved and shop created' };
  }

  async reject(id: number, rejectionReason: string) {
    const request = await this.sellerRequestRepository.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    request.status = RequestStatus.REJECTED;
    request.rejectionReason = rejectionReason;
    return this.sellerRequestRepository.save(request);
  }
}
