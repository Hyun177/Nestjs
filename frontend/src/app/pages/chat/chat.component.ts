import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chat-container">
      <!-- Sidebar -->
      <div class="convo-sidebar">
        <div class="sidebar-header">
          <h2>Messages</h2>
          <span class="msg-count" *ngIf="totalUnread > 0">{{ totalUnread }} unread</span>
        </div>
        
        <div class="search-box">
          <input type="text" placeholder="Search conversations..." [(ngModel)]="searchQuery" (input)="filterConversations()" />
        </div>

        <div class="convo-list">
          <ng-container *ngIf="filteredConversations.length > 0; else noConvos">
            <div *ngFor="let convo of filteredConversations" 
                 class="convo-item" 
                 [class.active]="selectedConversation?.id === convo.id"
                 [class.unread]="getUnreadCount(convo) > 0"
                 (click)="selectConversation(convo)">
              
              <div class="avatar-wrap">
                <div class="convo-avatar">
                  {{ getOtherPartyName(convo).charAt(0).toUpperCase() }}
                </div>
                <div class="online-indicator" *ngIf="convo.isOnline"></div>
              </div>

              <div class="convo-info">
                <div class="convo-top">
                  <span class="user-name">{{ getOtherPartyName(convo) }}</span>
                  <span class="time">{{ formatTime(convo.lastMessageAt || convo.createdAt) }}</span>
                </div>
                <div class="convo-bottom">
                  <span class="last-msg" [class.bold]="getUnreadCount(convo) > 0">{{ convo.lastMessage || 'Bắt đầu trò chuyện' }}</span>
                  <div class="badge" *ngIf="getUnreadCount(convo) > 0">{{ getUnreadCount(convo) }}</div>
                </div>
              </div>
            </div>
          </ng-container>
          <ng-template #noConvos>
            <div class="no-results">Chưa có cuộc trò chuyện nào</div>
          </ng-template>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-area" *ngIf="selectedConversation; else selectPrompt">
        <!-- Header -->
        <div class="chat-area-header">
          <div class="header-user-info">
            <div class="convo-avatar small">
              {{ getOtherPartyName(selectedConversation).charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3>{{ getOtherPartyName(selectedConversation) }}</h3>
              <span class="status-text">{{ isTyping ? 'Đang soạn tin...' : (selectedConversation.isOnline ? 'Đang hoạt động' : 'Offline') }}</span>
            </div>
          </div>
          <div class="header-actions">
            <!-- Add context menu or call button here if needed -->
          </div>
        </div>

        <!-- Messages list -->
        <div class="messages-list" #scrollContainer>
          <div class="message-date-separator">
            <span>Bắt đầu trò chuyện</span>
          </div>

          <div *ngFor="let msg of messages; let i = index" 
               class="message-wrapper" 
               [class.me]="msg.senderId === currentUserId">

            <!-- Product Context Card type message -->
            <div class="product-msg-card" *ngIf="msg.type === 'PRODUCT' && msg.metadata" [routerLink]="['/product', msg.metadata.productId]">
              <img [src]="formatImageUrl(msg.metadata.productImage)" alt="Product">
              <div class="product-msg-info">
                <div class="product-name">{{ msg.metadata.productName }}</div>
                <div class="product-price">{{ msg.metadata.price | number:'1.0-0' }}đ</div>
              </div>
            </div>

            <!-- Normal text message -->
            <div class="message-bubble-row" *ngIf="msg.type === 'TEXT'">
              <div class="message-bubble" [hidden]="!msg.content">
                {{ msg.content }}
                <div class="msg-meta">
                  {{ msg.createdAt | date:'HH:mm' }}
                  <span *ngIf="msg.senderId === currentUserId" class="read-status">
                    <svg viewBox="0 0 24 24" width="12" height="12" [attr.fill]="msg.isRead ? '#3b82f6' : 'currentColor'">
                       <path *ngIf="msg.isRead" d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                       <path *ngIf="!msg.isRead" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Product Context to SEND -->
          <div class="context-product-send-card" *ngIf="contextProduct">
            <button class="close-context" (click)="removeContextProduct()">×</button>
            <img [src]="formatImageUrl(contextProduct.image)" alt="Context Product">
            <div class="context-info">
                <div class="context-label">Gửi quan tâm về:</div>
                <div class="product-name">{{ contextProduct.name }}</div>
                <div class="product-price">{{ contextProduct.price | number:'1.0-0' }}đ</div>
            </div>
            <button class="send-context-btn" (click)="sendProductContextMessage()">
               Gửi
            </button>
          </div>

          <div class="typing-indicator-wrap" *ngIf="isTyping">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Input Box -->
        <div class="input-container">
          <input type="text" 
                 [(ngModel)]="newMessage" 
                 (keyup.enter)="sendMessage()" 
                 (input)="handleTyping()"
                 placeholder="Nhập tin nhắn..." />
          <button class="send-btn" (click)="sendMessage()" [disabled]="!newMessage.trim()">
             <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
             </svg>
          </button>
        </div>
      </div>

      <ng-template #selectPrompt>
        <div class="empty-chat">
          <div class="empty-icon-wrap">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
               <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
             </svg>
          </div>
          <h3>Chào mừng đến với hệ thống tin nhắn</h3>
          <p>Chọn một cuộc trò chuyện để bắt đầu.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      height: 750px;
      max-height: calc(100vh - 100px);
      max-width: 1300px;
      margin: 30px auto;
      background: #fff;
      font-family: 'Inter', sans-serif;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    /* Sidebar */
    .convo-sidebar {
      width: 350px;
      border-right: 1px solid #e0e6ed;
      display: flex;
      flex-direction: column;
      background: #fafbfc;
    }

    .sidebar-header {
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      h2 { font-size: 20px; margin: 0; font-weight: 800; color: #1e293b; }
      .msg-count { background: #ef4444; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2); }
    }

    .search-box {
      padding: 0 24px 16px;
      input {
        width: 100%;
        height: 44px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0 16px;
        font-size: 14px;
        outline: none;
        transition: all 0.2s;
        &:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      }
    }

    .convo-list { flex: 1; overflow-y: auto; }
    .no-results { padding: 40px 20px; text-align: center; color: #94a3b8; font-size: 14px; }

    .convo-item {
      display: flex;
      padding: 16px 24px;
      gap: 14px;
      cursor: pointer;
      align-items: center;
      transition: all 0.2s;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
      
      &:hover { background: #fff; }
      &.active { background: #eff6ff; border-left: 4px solid #3b82f6; padding-left: 20px; }
    }

    .avatar-wrap { position: relative; }
    .convo-avatar {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #3b82f6, #60a5fa);
      color: #fff;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
      &.small { width: 40px; height: 40px; font-size: 16px; border-radius: 10px; }
    }
    .online-indicator {
      position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; background: #22c55e;
      border: 2px solid #fff; border-radius: 50%;
    }

    .convo-info {
      flex: 1; overflow: hidden;
      .convo-top {
        display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;
        .user-name { font-weight: 700; font-size: 15px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
        .time { font-size: 11px; color: #94a3b8; font-weight: 500; }
      }
      .convo-bottom {
        display: flex; justify-content: space-between; align-items: center;
        .last-msg { font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .last-msg.bold { font-weight: 700; color: #1e293b; }
        .badge { background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; margin-left: 8px;}
      }
    }

    /* Main Area */
    .chat-area { flex: 1; display: flex; flex-direction: column; background: #fff; position: relative; }

    .chat-area-header {
      padding: 16px 24px;
      background: #fff;
      border-bottom: 1px solid #e0e6ed;
      display: flex; justify-content: space-between; align-items: center;
      .header-user-info {
         display: flex; align-items: center; gap: 12px;
         h3 { margin: 0 0 2px 0; font-size: 16px; font-weight: 700; color: #1e293b; }
         .status-text { font-size: 12px; color: #10b981; font-weight: 500; }
      }
    }

    .messages-list {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f8fafc;
    }

    .message-date-separator {
      text-align: center; margin: 10px 0 20px;
      span { background: #e2e8f0; color: #64748b; font-size: 11px; padding: 4px 12px; border-radius: 12px; font-weight: 600; }
    }

    .message-wrapper {
      display: flex; flex-direction: column;
      &.me { align-items: flex-end; }
      &:not(.me) { align-items: flex-start; }
    }

    .message-bubble-row { display: flex; max-width: 70%; }

    .message-bubble {
      padding: 12px 18px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
      background: #fff;
      color: #334155;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.02);
      
      .me & { background: #3b82f6; color: #fff; border: none; border-radius: 18px; border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
    }

    .msg-meta { 
      font-size: 10px; margin-top: 6px; display: flex; align-items: center; gap: 4px; opacity: 0.7; justify-content: flex-end;
      .me & { color: #e0e7ff; }
      &:not(.me) { color: #94a3b8; }
    }

    /* Product card inside chat stream */
    .product-msg-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px;
      display: flex; gap: 12px; cursor: pointer; max-width: 320px; margin-bottom: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      img { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; }
      .product-msg-info { 
         display: flex; flex-direction: column; justify-content: center;
         .product-name { font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
         .product-price { font-size: 14px; color: #ef4444; font-weight: 700; }
      }
    }

    /* Floating context card before send */
    .context-product-send-card {
        position: absolute; bottom: 80px; left: 24px; right: 24px;
        background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 16px;
        display: flex; align-items: center; gap: 16px;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.06); z-index: 10;
        
        .close-context { position: absolute; top: 6px; right: 10px; background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; }
        
        img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; }
        .context-info {
            flex: 1;
            .context-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;}
            .product-name { font-size: 14px; font-weight: 700; color: #1e293b; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
            .product-price { font-size: 13px; color: #ef4444; font-weight: 700; }
        }
        .send-context-btn { background: #10b981; color: #fff; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 13px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); transition: all 0.2s;}
        .send-context-btn:hover { background: #059669; transform: translateY(-1px); }
    }

    /* Typing indicator */
    .typing-indicator-wrap { align-self: flex-start; margin-top: -8px; margin-bottom: 8px; }
    .typing-indicator {
      background: #e2e8f0; padding: 12px 16px; border-radius: 18px; border-bottom-left-radius: 4px;
      display: flex; gap: 4px; width: fit-content;
      span { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; display: block; animation: typing 1.4s infinite ease-in-out both; }
      span:nth-child(1) { animation-delay: -0.32s; }
      span:nth-child(2) { animation-delay: -0.16s; }
    }
    @keyframes typing { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }

    .input-container {
      padding: 20px 24px;
      background: #fff;
      display: flex;
      gap: 16px;
      border-top: 1px solid #e0e6ed;
      align-items: center;
      input { 
          flex: 1; height: 48px; border-radius: 24px; background: #f1f5f9; border: 1px solid transparent; 
          padding: 0 20px; outline: none; font-size: 14px; transition: all 0.2s;
          &:focus { background: #fff; border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      }
      .send-btn { 
          width: 48px; height: 48px; border-radius: 50%; background: #3b82f6; color: #fff; border: none; 
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          &:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
          &:not(:disabled):hover { background: #2563eb; transform: translateY(-2px); }
      }
    }

    .empty-chat { 
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc;
      .empty-icon-wrap { width: 96px; height: 96px; background: #e0e7ff; color: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
      h3 { margin: 0 0 8px 0; color: #1e293b; font-size: 24px; font-weight: 800;}
      p { color: #64748b; font-size: 15px;}
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  conversations: any[] = [];
  filteredConversations: any[] = [];
  searchQuery: string = '';
  
  selectedConversation: any = null;
  messages: any[] = [];
  newMessage = '';
  currentUserId: number | null = null;
  
  targetConvoId: number | null = null;
  contextProduct: any = null;
  
  isTyping = false;
  private typingTimeout: any;
  private shouldScroll = false;
  private subs = new Subscription();

  ngOnInit() {
    this.currentUserId = this.authService.getUserId();
    this.chatService.connect();

    this.setupListeners();

    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.targetConvoId = +params['id'];
      }
      if (params['productId']) {
        this.loadContextProduct(+params['productId']);
      }
      this.loadConversations();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.selectedConversation) {
      this.chatService.leaveConversation(this.selectedConversation.id);
    }
    this.chatService.disconnect();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private setupListeners() {
    this.subs.add(this.chatService.onMessage$.subscribe(msg => {
      if (this.selectedConversation && msg.conversationId === this.selectedConversation.id) {
        this.messages.push(msg);
        this.shouldScroll = true;
        this.cdr.detectChanges();
      }
    }));

    this.subs.add(this.chatService.onConversationUpdate$.subscribe(data => {
       const idx = this.conversations.findIndex(c => c.id === data.conversation.id);
       if (idx !== -1) {
           this.conversations[idx] = data.conversation;
       } else {
           this.conversations.unshift(data.conversation);
       }
       this.conversations.sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
       this.filterConversations();
       this.cdr.detectChanges();
    }));

    this.subs.add(this.chatService.onTyping$.subscribe(data => {
      if (this.selectedConversation && data.conversationId === this.selectedConversation.id && data.userId !== this.currentUserId) {
         this.isTyping = true;
         this.shouldScroll = true;
         this.cdr.detectChanges();
      }
    }));

    this.subs.add(this.chatService.onStopTyping$.subscribe(data => {
      if (this.selectedConversation && data.conversationId === this.selectedConversation.id) {
         this.isTyping = false;
         this.cdr.detectChanges();
      }
    }));
  }

  loadContextProduct(id: number) {
    this.productService.getProductById(id).subscribe(prod => {
      this.contextProduct = prod;
      this.cdr.detectChanges();
    });
  }

  removeContextProduct() {
     this.contextProduct = null;
  }

  loadConversations() {
    this.chatService.getConversations().subscribe(res => {
      this.conversations = res;
      this.filterConversations();
      
      if (this.targetConvoId) {
        const found = this.conversations.find(c => c.id === this.targetConvoId);
        if (found) {
           this.selectConversation(found);
        }
      }
      this.cdr.detectChanges();
    });
  }

  filterConversations() {
    if (!this.searchQuery.trim()) {
       this.filteredConversations = [...this.conversations];
    } else {
       const q = this.searchQuery.toLowerCase();
       this.filteredConversations = this.conversations.filter(c => 
          this.getOtherPartyName(c).toLowerCase().includes(q) || 
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
       );
    }
  }

  selectConversation(convo: any) {
    if (this.selectedConversation) {
       this.chatService.leaveConversation(this.selectedConversation.id);
    }

    this.selectedConversation = convo;
    this.newMessage = '';
    
    // Join socket room
    this.chatService.joinConversation(convo.id);
    
    // Clear context if navigating strictly to another chat
    if (this.targetConvoId && this.targetConvoId !== convo.id) {
       this.contextProduct = null;
    }

    this.loadMessages(convo.id);
  }

  loadMessages(id: number) {
    this.chatService.getMessages(id).subscribe(res => {
      this.messages = res;
      this.shouldScroll = true;
      
      // Update local unread count since getMessages marks them read
      if (this.selectedConversation) {
         const conv = this.conversations.find(c => c.id === id);
         if (conv) {
             if (this.currentUserId === conv.buyerId) conv.unreadBuyer = 0;
             else conv.unreadSeller = 0;
         }
      }
      
      this.cdr.detectChanges();
    });
  }

  handleTyping() {
    if (!this.selectedConversation) return;
    this.chatService.emitTyping(this.selectedConversation.id);
    
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
       this.chatService.emitStopTyping(this.selectedConversation.id);
    }, 2000);
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedConversation) return;

    this.chatService.sendMessage(this.selectedConversation.id, this.newMessage).subscribe(() => {
       // We rely on socket receive to push to this.messages, but if we want instant optimistic UI:
       // We will just let the socket handle it since local network is fast.
    });
    this.newMessage = '';
    this.chatService.emitStopTyping(this.selectedConversation.id);
  }

  sendProductContextMessage() {
     if (!this.contextProduct || !this.selectedConversation) return;
     
     const metadata = {
        productId: this.contextProduct.id,
        productName: this.contextProduct.name,
        price: this.contextProduct.price,
        productImage: this.contextProduct.image
     };

     this.chatService.sendMessage(this.selectedConversation.id, '', 'PRODUCT', metadata).subscribe();
     this.contextProduct = null;
  }

  getOtherPartyName(convo: any): string {
     if (!convo || !this.currentUserId) return 'Unknown';
     
     const isIBuyer = convo.buyerId === this.currentUserId;
     const other = isIBuyer ? convo.seller : convo.buyer;
     
     if (!other) return 'User';
     
     if (other.firstname || other.lastname) {
       return `${other.firstname || ''} ${other.lastname || ''}`.trim();
     }
     return other.name || other.email || 'User';
  }

  getUnreadCount(convo: any): number {
      if (!convo || !this.currentUserId) return 0;
      return convo.buyerId === this.currentUserId ? convo.unreadBuyer : convo.unreadSeller;
  }

  get totalUnread(): number {
      return this.conversations.reduce((acc, c) => acc + this.getUnreadCount(c), 0);
  }

  formatImageUrl(url: string | undefined): string {
     if (!url) return 'assets/default-product.png';
     if (url.startsWith('http')) return url;
     return 'http://localhost:3000' + url;
  }

  formatTime(dateStr: string): string {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
          return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' });
      }
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
