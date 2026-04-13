import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { ShopService } from '../shop/shop.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    private shopService: ShopService,
  ) {}

  async findOrCreateConversation(buyerId: number, sellerId: number) {
    if (buyerId === sellerId) {
      throw new Error('Buyer and seller cannot be the same');
    }

    let conversation = await this.conversationRepo.findOne({
      where: { buyerId, sellerId },
      relations: ['buyer', 'seller', 'buyer.shop', 'seller.shop'],
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({ buyerId, sellerId });
      conversation = await this.conversationRepo.save(conversation);
      // reload relations
      conversation = await this.conversationRepo.findOne({
        where: { id: conversation.id },
        relations: ['buyer', 'seller', 'buyer.shop', 'seller.shop'],
      });
    }
    return conversation;
  }

  async getConversations(userId: number) {
    // A user can be a buyer OR a seller
    const conversations = await this.conversationRepo.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      relations: ['buyer', 'seller', 'buyer.shop', 'seller.shop'],
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });
    return conversations;
  }

  async getConversationById(id: number) {
    return this.conversationRepo.findOne({
      where: { id },
      relations: ['buyer', 'seller', 'buyer.shop', 'seller.shop'],
    });
  }

  async sendMessage(
    senderId: number,
    conversationId: number,
    content: string,
    type: string = 'TEXT',
    metadata: any = null,
  ) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const message = this.messageRepo.create({
      senderId,
      conversationId,
      content,
      type,
      metadata,
      isRead: false,
    });

    const savedMsg = await this.messageRepo.save(message);

    // Update conversation lastMessage & unreads
    const isSenderBuyer = senderId === conversation.buyerId;

    // Determine content preview
    let summary = content;
    if (type === 'PRODUCT') summary = '[Product Shared]';
    else if (type === 'IMAGE') summary = '[Image Shared]';

    if (isSenderBuyer) {
      await this.conversationRepo.update(conversationId, {
        lastMessage: summary,
        lastMessageAt: new Date(),
        unreadSeller: () => 'unreadSeller + 1',
      });
    } else {
      await this.conversationRepo.update(conversationId, {
        lastMessage: summary,
        lastMessageAt: new Date(),
        unreadBuyer: () => 'unreadBuyer + 1',
      });
    }

    return this.messageRepo.findOne({
      where: { id: savedMsg.id },
      relations: ['sender'],
    });
  }

  async getMessages(conversationId: number, userId: number) {
    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      relations: ['sender'],
    });

    // Mark as read
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (conversation) {
      if (userId === conversation.buyerId && conversation.unreadBuyer > 0) {
        await this.conversationRepo.update(conversationId, { unreadBuyer: 0 });
      } else if (
        userId === conversation.sellerId &&
        conversation.unreadSeller > 0
      ) {
        await this.conversationRepo.update(conversationId, { unreadSeller: 0 });
      }
    }

    return messages;
  }
}
