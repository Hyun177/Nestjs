import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async createMessage(
    data: CreateMessageDto,
    userId: number,
  ): Promise<Message> {
    const message = this.messageRepository.create({ ...data, userId });
    return this.messageRepository.save(message);
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    return this.messageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMessageById(id: number): Promise<Message> {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }
}
