import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress } from './entities/user-address.entity';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(UserAddress)
    private addressRepo: Repository<UserAddress>,
  ) {}

  async getAddresses(userId: number) {
    return this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async createAddress(userId: number, dto: Partial<UserAddress>) {
    // Nếu là default, bỏ default các địa chỉ khác
    if (dto.isDefault) {
      await this.addressRepo.update({ userId }, { isDefault: false });
    }
    // Nếu chưa có địa chỉ nào, tự set default
    const count = await this.addressRepo.count({ where: { userId } });
    if (count === 0) dto.isDefault = true;

    const address = this.addressRepo.create({ ...dto, userId });
    return this.addressRepo.save(address);
  }

  async updateAddress(id: number, userId: number, dto: Partial<UserAddress>) {
    const address = await this.addressRepo.findOne({ where: { id } });
    if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');
    if (address.userId !== userId) throw new ForbiddenException();

    if (dto.isDefault) {
      await this.addressRepo.update({ userId }, { isDefault: false });
    }
    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async deleteAddress(id: number, userId: number) {
    const address = await this.addressRepo.findOne({ where: { id } });
    if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');
    if (address.userId !== userId) throw new ForbiddenException();
    await this.addressRepo.remove(address);

    // Nếu xóa địa chỉ default, set địa chỉ đầu tiên còn lại làm default
    if (address.isDefault) {
      const first = await this.addressRepo.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (first) {
        first.isDefault = true;
        await this.addressRepo.save(first);
      }
    }
    return { message: 'Đã xóa địa chỉ' };
  }

  async setDefault(id: number, userId: number) {
    await this.addressRepo.update({ userId }, { isDefault: false });
    const address = await this.addressRepo.findOne({ where: { id, userId } });
    if (!address) throw new NotFoundException();
    address.isDefault = true;
    return this.addressRepo.save(address);
  }
}
