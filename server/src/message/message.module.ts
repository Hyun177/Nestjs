import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { ShopModule } from '../shop/shop.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Conversation]),
    AuthModule,
    ShopModule,
    UsersModule,
  ],
  controllers: [MessageController],
  providers: [MessageService, ChatGateway],
  exports: [MessageService],
})
export class MessageModule {}
