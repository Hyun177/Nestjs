import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = 'https://nestjs-zvmg.onrender.com/api/chat';

  private socket: Socket | null = null;
  public onMessage$ = new Subject<any>();
  public onConversationUpdate$ = new Subject<any>();
  public onTyping$ = new Subject<any>();
  public onStopTyping$ = new Subject<any>();

  connect() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    this.socket = io('https://nestjs-zvmg.onrender.com', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('receive_message', (message: any) => {
      this.onMessage$.next(message);
    });

    this.socket.on('update_conversation_list', (data: any) => {
      this.onConversationUpdate$.next(data);
    });

    this.socket.on('user_typing', (data: any) => {
      this.onTyping$.next(data);
    });

    this.socket.on('user_stop_typing', (data: any) => {
      this.onStopTyping$.next(data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: number) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  leaveConversation(conversationId: number) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  emitTyping(conversationId: number) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { conversationId });
    }
  }

  emitStopTyping(conversationId: number) {
    if (this.socket?.connected) {
      this.socket.emit('stop_typing', { conversationId });
    }
  }

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversations`);
  }

  createConversation(targetUserId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/conversations`, { targetUserId });
  }

  getMessages(conversationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/messages/${conversationId}`);
  }

  sendMessage(
    conversationId: number,
    content: string,
    type: string = 'TEXT',
    metadata: any = null,
  ): Observable<any> {
    if (this.socket?.connected) {
      // Send via socket
      this.socket.emit('send_message', { conversationId, content, type, metadata });
      // Return empty observable since socket listener will handle the response
      return new Observable((sub) => {
        sub.next(null);
        sub.complete();
      });
    } else {
      // Fallback to REST
      return this.http.post(`${this.apiUrl}/messages`, { conversationId, content, type, metadata });
    }
  }
}
