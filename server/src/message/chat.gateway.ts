import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Track online users mapping userId to socketId
  private connectedUsers = new Map<number, string>();

  constructor(
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const authToken = socket.handshake.auth?.token;
      const headerToken = socket.handshake.headers['authorization'];
      let token: string | undefined;
      if (typeof authToken === 'string') {
        token = authToken;
      } else if (typeof headerToken === 'string') {
        token = headerToken.split(' ')[1];
      }
      if (!token) throw new Error('Unauthenticated');

      const payload = this.jwtService.verify<{
        sub?: string;
        userId?: string;
        id?: string;
      }>(token, { secret: 'secretKey' });
      const userId = Number(payload.sub ?? payload.userId ?? payload.id);

      if (!userId) throw new Error('Invalid user ID in token');

      this.connectedUsers.set(userId, socket.id);
      socket.data.userId = userId;
      await this.userService.updateOnlineStatus(userId, true);

      // Broadcast online status
      this.server.emit('user_online', { userId });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.log('Socket connection error:', message);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as number | undefined;
    if (typeof userId === 'number') {
      this.connectedUsers.delete(userId);

      // Update DB to offline
      await this.userService.updateOnlineStatus(userId, false);

      this.server?.emit('user_offline', { userId });
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: number },
  ) {
    if (!payload?.conversationId) return;
    void socket.join(`conversation_${payload.conversationId}`);
    // Update local state when joining so client syncs
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: number },
  ) {
    if (!payload?.conversationId) return;
    void socket.leave(`conversation_${payload.conversationId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: number },
  ) {
    const userId = socket.data.userId as number | undefined;
    if (typeof userId !== 'number' || !payload?.conversationId) return;
    socket.to(`conversation_${payload.conversationId}`).emit('user_typing', {
      userId,
      conversationId: payload.conversationId,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: number },
  ) {
    const userId = socket.data.userId as number | undefined;
    if (typeof userId !== 'number' || !payload?.conversationId) return;
    socket
      .to(`conversation_${payload.conversationId}`)
      .emit('user_stop_typing', {
        userId,
        conversationId: payload.conversationId,
      });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: {
      conversationId: number;
      content: string;
      type?: string;
      metadata?: any;
    },
  ) {
    const senderId = socket.data.userId as number | undefined;
    if (typeof senderId !== 'number' || !payload?.conversationId) return;

    // Save to DB
    const message = await this.messageService.sendMessage(
      senderId,
      payload.conversationId,
      payload.content || '',
      payload.type || 'TEXT',
      payload.metadata,
    );

    // Emit back to room
    this.server
      .to(`conversation_${payload.conversationId}`)
      .emit('receive_message', message);

    // Also emit to the participants globally so their sidebar can update 'lastMessage'
    const conv = await this.messageService.getConversationById(
      payload.conversationId,
    );
    if (conv) {
      const targetId = conv.buyerId === senderId ? conv.sellerId : conv.buyerId;
      const targetSocketId = this.connectedUsers.get(targetId);
      if (targetSocketId) {
        this.server
          .to(targetSocketId)
          .emit('update_conversation_list', { message, conversation: conv });
      }

      // Update sender's sidebar as well locally
      socket.emit('update_conversation_list', { message, conversation: conv });
    }

    return message;
  }
}
