import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Posts } from './entities/post.entity';
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Posts)
    private postRepo: Repository<Posts>,
  ) {}
  async createPost(data: Partial<Posts>, userId: number): Promise<Posts> {
    const newPost = this.postRepo.create({ ...data, userId });
    return await this.postRepo.save(newPost);
  }
  async getPosts(): Promise<Posts[]> {
    return await this.postRepo.find();
  }
  async getPostById(id: number): Promise<Posts | null> {
    return await this.postRepo.findOneBy({ id });
  }
  async updatePost(id: number, data: Partial<Posts>): Promise<Posts> {
    await this.postRepo.update(id, data);
    const updatedPost = await this.postRepo.findOneBy({ id });
    if (!updatedPost) {
      throw new Error('Post not found');
    }
    return updatedPost;
  }

  async deletePost(id: number): Promise<void> {
    await this.postRepo.delete(id);
  }
}
