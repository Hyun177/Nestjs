import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import type { RequestWithUser } from '../common/types/request-with-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) {
    return this.newsletterService.getSubscriptionForUser(req.user.userId);
  }

  @Post('subscribe')
  @UseGuards(JwtOptionalGuard)
  subscribe(@Body('email') email: string, @Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.newsletterService.subscribe(email, userId);
  }
}
