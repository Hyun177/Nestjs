import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from './newsletter-subscriber.entity';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private repo: Repository<NewsletterSubscriber>,
  ) {}

  async subscribe(email: string, userId?: number) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Email không hợp lệ');
    }
    const existing = await this.repo.findOne({ where: { email: normalized } });
    if (existing) {
      if (userId && !existing.userId) {
        existing.userId = userId;
        await this.repo.save(existing);
      }
      return { subscribed: true };
    }
    await this.repo.save(this.repo.create({ email: normalized, userId: userId ?? null }));
    return { subscribed: true };
  }

  async listSubscriberEmails(): Promise<string[]> {
    const rows = await this.repo.find();
    return rows.map((r) => r.email).filter(Boolean);
  }

  async getSubscriptionForUser(userId: number) {
    const row = await this.repo.findOne({ where: { userId } });
    return { subscribed: !!row, email: row?.email || null };
  }
}

