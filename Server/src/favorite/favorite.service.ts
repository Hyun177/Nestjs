import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async toggleFavorite(userId: number, productId: number) {
    const favorite = await this.favoriteRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (favorite) {
      await this.favoriteRepository.remove(favorite);
      return { status: 'removed' };
    }

    const newFavorite = this.favoriteRepository.create({
      user: { id: userId } as User,
      product: { id: productId } as Product,
    });
    await this.favoriteRepository.save(newFavorite);
    return { status: 'added' };
  }

  async getFavorites(userId: number) {
    return await this.favoriteRepository.find({
      where: { user: { id: userId } },
      relations: ['product', 'product.brand', 'product.category'],
    });
  }

  async isFavorite(userId: number, productId: number) {
    const count = await this.favoriteRepository.count({
        where: { user: { id: userId }, product: { id: productId } },
    });
    return count > 0;
  }
}
