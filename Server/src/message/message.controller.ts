import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('conversations')
  async createConversation(@Request() req, @Body('targetUserId') targetUserId: number) {
    // If I'm creating it with a target, I am buying from their shop, usually.
    // However, if the shop is creating it, it would be the reverse. Assuming buyer is the caller for this endpoint.
    return this.messageService.findOrCreateConversation(req.user.userId, +targetUserId);
  }

  @Get('conversations')
  async getMyConversations(@Request() req) {
    return this.messageService.getConversations(req.user.userId);
  }

  @Post('messages')
  async sendMessage(
    @Request() req,
    @Body('conversationId') conversationId: number,
    @Body('content') content: string,
    @Body('type') type?: string,
    @Body('metadata') metadata?: any,
  ) {
    return this.messageService.sendMessage(req.user.userId, +conversationId, content, type, metadata);
  }

  @Get('messages/:conversationId')
  async getMessages(@Request() req, @Param('conversationId') conversationId: string) {
    return this.messageService.getMessages(+conversationId, req.user.userId);
  }
}
