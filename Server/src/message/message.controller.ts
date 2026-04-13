import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { RequestWithUser } from '../users/types/user-payload.type';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateConversationDto } from './dto/createconversation.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('conversations')
  async createConversation(
    @Req() req: RequestWithUser,
    @Body() body: CreateConversationDto,
  ) {
    return this.messageService.findOrCreateConversation(
      req.user.userId,
      body.targetUserId,
    );
  }

  @Get('conversations')
  async getMyConversations(@Req() req: RequestWithUser) {
    return this.messageService.getConversations(req.user.userId);
  }

  @Post('messages')
  async sendMessage(
    @Req() req: RequestWithUser,
    @Body('conversationId') conversationId: number,
    @Body('content') content: string,
    @Body('type') type?: string,
    @Body('metadata') metadata?: any,
  ) {
    return this.messageService.sendMessage(
      req.user.userId,
      +conversationId,
      content,
      type,
      metadata,
    );
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Req() req: RequestWithUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messageService.getMessages(+conversationId, req.user.userId);
  }
}
