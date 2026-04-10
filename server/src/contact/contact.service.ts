import { Injectable, NotFoundException } from '@nestjs/common'; 
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, ContactStatus } from './entities/contact.entity';
import { CreateContactDto, ReplyContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async create(createContactDto: CreateContactDto, userId?: number): Promise<Contact> {
    const contact = this.contactRepository.create({ ...createContactDto, userId });
    return await this.contactRepository.save(contact);
  }

  async findByUserId(userId: number): Promise<Contact[]> {
    return await this.contactRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Contact[]> {
    return await this.contactRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Contact> {
    const contact = await this.contactRepository.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException(`Contact request with ID ${id} not found`);
    }
    return contact;
  }

  async reply(id: number, replyContactDto: ReplyContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    
    contact.replyMessage = replyContactDto.replyMessage;
    contact.status = ContactStatus.REPLIED;
    contact.repliedAt = new Date();
    
    return await this.contactRepository.save(contact);
  }

  async remove(id: number): Promise<void> {
    const result = await this.contactRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Contact request with ID ${id} not found`);
    }
  }
}
