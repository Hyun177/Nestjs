import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PostsService } from '../posts.service';

@Injectable()
export class PostOwnershipGuard implements CanActivate {
  constructor(private postsService: PostsService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const postId = request.params.id;

    if (!user || !postId) {
      return false;
    }

    const post = await this.postsService.getPostById(Number(postId));

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== user.userId) {
      throw new ForbiddenException('You are not the owner of this post');
    }

    return true;
  }
}
