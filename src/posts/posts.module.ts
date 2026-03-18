import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Posts } from './entities/post.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [PostsService],
  imports: [TypeOrmModule.forFeature([Posts]), AuthModule],
  controllers: [PostsController],
})
export class PostsModule { }
