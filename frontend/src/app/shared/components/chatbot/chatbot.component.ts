import {
  Component,
  PLATFORM_ID,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, NzIconModule, RouterModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
})
export class ChatbotComponent implements AfterViewChecked {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private cartService = inject(CartService);

  @ViewChild('chatBody') private chatBody!: ElementRef;

  isOpen = signal(false);
  messages = signal<
    { role: 'user' | 'model'; content: string; products?: any[]; quickReplies?: string[] }[]
  >([
    {
      role: 'model',
      content:
        'Xin chào! Mình là trợ lý AI. Mình có thể hỗ trợ bạn tìm kiếm sản phẩm hoặc lên đơn đặt hàng nhanh chóng',
    },
  ]);
  inputText = signal('');
  isLoading = signal(false);

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatBody && this.chatBody.nativeElement) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  parseMarkdown(text: string): SafeHtml {
    const html = text
      .replace(/\n_\(.*?\)_/g, '') // xóa context tag _(...)_ ở cuối dòng
      .replace(/_\(.*?\)_/g, '') // xóa context tag bất kỳ vị trí
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  parseOrderContext(content: string) {
    const match = content.match(
      /product_id:(\d+),color:([^,\)\n_]*),size:([^,\)\n_]*),payment:([^,\)\n_]*)/i,
    );
    if (!match) return null;
    return {
      productId: Number(match[1]),
      color: match[2]?.trim() || '',
      size: match[3]?.trim() || '',
      payment: match[4]?.trim().toUpperCase() || 'COD',
    };
  }

  isConfirmPrompt(content: string) {
    return /bạn xác nhận đặt đơn hàng này chứ\?/i.test(content);
  }

  isConfirmAnswer(text: string) {
    return /(^|\s)(có|đồng ý|yes|ok|xác nhận)(\s|$)/i.test(text);
  }

  async handleConfirmRedirect(option: string): Promise<boolean> {
    const lastBot = [...this.messages()].reverse().find((msg) => msg.role === 'model');
    if (!lastBot || !this.isConfirmPrompt(lastBot.content) || !this.isConfirmAnswer(option)) {
      return false;
    }

    const context = this.parseOrderContext(lastBot.content);
    if (!context || !context.productId) {
      return false;
    }

    this.messages.update((m) => [...m, { role: 'user', content: option }]);
    this.isLoading.set(true);
    const currentItems = this.cartService.getCurrentCartItems();
    
    // Tìm item trùng - xử lý empty string/null giống backend
    const duplicateItem = currentItems.find(
      (i: any) => {
        const itemSize = i.size === '' || i.size === null || i.size === undefined ? null : i.size;
        const itemColor = i.color === '' || i.color === null || i.color === undefined ? null : i.color;
        const contextSize = context.size === '' || context.size === null || context.size === undefined ? null : context.size;
        const contextColor = context.color === '' || context.color === null || context.color === undefined ? null : context.color;
        
        return i.productId === context.productId &&
               itemSize === contextSize &&
               itemColor === contextColor;
      }
    );

    // Nếu có duplicate, xóa trước
    if (duplicateItem) {
      console.log(`Found duplicate item ${duplicateItem.id}, removing before adding new item`);
      this.cartService.removeItem(duplicateItem.id).subscribe({
        next: () => {
          // Sau khi xóa, thêm mới
          console.log('Duplicate removed, adding new item');
          this.addNewItemToCart(context);
        },
        error: (err) => {
          console.error('Error removing duplicate:', err);
          // Nếu xóa lỗi, vẫn thêm mới (backend sẽ xử lý duplicate)
          this.addNewItemToCart(context);
        }
      });
    } else {
      // Không có duplicate, thêm luôn
      console.log('No duplicate found, adding new item');
      this.addNewItemToCart(context);
    }

    return true;
  }

  private addNewItemToCart(context: any) {
    this.cartService.addToCart(context.productId, 1, context.size, context.color).subscribe({
      next: (cart: any) => {
        const items = cart.items || [];
        // Find the matching item (handling null/empty strings consistently)
        const match = items.find((i: any) => {
          const itemSize = i.size === '' || i.size === null || i.size === undefined ? null : i.size;
          const itemColor = i.color === '' || i.color === null || i.color === undefined ? null : i.color;
          const contextSize = context.size === '' || context.size === null || context.size === undefined ? null : context.size;
          const contextColor = context.color === '' || context.color === null || context.color === undefined ? null : context.color;
          
          return i.productId === context.productId && 
                 itemSize === contextSize && 
                 itemColor === contextColor;
        });
        const itemIds = match ? [match.id] : [];
        
        // Add success message before redirecting
        this.messages.update((m) => [
          ...m,
          {
            role: 'model',
            content: 'Đã thêm sản phẩm vào giỏ hàng! Đang chuyển đến trang thanh toán...',
          },
        ]);
        this.isLoading.set(false);
        
        // Navigate with payment method
        setTimeout(() => {
          this.router.navigate(['/order-confirm'], { 
            state: { 
              itemIds,
              paymentMethod: context.payment 
            } 
          });
        }, 500);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messages.update((m) => [
          ...m,
          {
            role: 'model',
            content:
              'Xin lỗi, không thể chuyển tới trang thanh toán. Vui lòng thử lại hoặc kiểm tra lại giỏ hàng.',
          },
        ]);
      },
    });
  }

  extractQuickReplies(content: string): string[] {
    const replies = new Set<string>();
    const lines = content.split(/\r?\n/).map((line) => line.trim());

    for (const line of lines) {
      if (!line) continue;

      // Các lựa chọn dạng 1️⃣, 2️⃣, 3️⃣
      const emojiChoice = line.match(/^\s*[0-9]+\s*️⃣?\s*(.+)$/);
      if (emojiChoice) {
        const reply = emojiChoice[1].trim();
        if (reply && !reply.toLowerCase().startsWith('ví dụ')) {
          replies.add(reply);
          continue;
        }
      }

      // Các danh sách dạng • Màu sắc: Xanh Dương, Cam, Bạc
      const listChoice = line.match(/^(?:•|[-*])\s*[^:]+:\s*(.+)$/);
      if (listChoice) {
        const values = listChoice[1]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        for (const item of values) {
          replies.add(item);
        }
        continue;
      }

      // Các danh sách bullet đơn giản nếu chứa dấu phẩy
      if ((line.startsWith('•') || line.startsWith('-')) && line.includes(',')) {
        // Avoid turning price formatting (e.g. "599,000 VNĐ") into quick replies.
        // These lines are typically product list items, not selectable options.
        if (/(vnd|vnđ)/i.test(line) && /\d{1,3},\d{3}/.test(line)) {
          continue;
        }
        const values = line
          .replace(/^[•\-]\s*/, '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        for (const item of values) {
          replies.add(item);
        }
      }
    }

    return Array.from(replies).slice(0, 12);
  }

  sendQuickReply(option: string) {
    if (!option || this.isLoading()) return;
    this.handleConfirmRedirect(option).then((handled) => {
      if (!handled) {
        this.inputText.set(option);
        this.sendMessage();
      }
    });
  }

  toggleChat() {
    this.isOpen.update((v) => !v);
  }

  getFullUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://nestjs-zvmg.onrender.com${path.startsWith('/') ? '' : '/'}${path}`;
  }

  sendMessage() {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;

    this.handleConfirmRedirect(text).then((handled) => {
      if (handled) {
        this.inputText.set('');
        return;
      }

      this.messages.update((m) => [...m, { role: 'user', content: text }]);
      this.inputText.set('');
      this.isLoading.set(true);

      let token = null;
      if (isPlatformBrowser(this.platformId)) {
        token = localStorage.getItem('accessToken');
      }

      // Construct history for Chat API
      const history = this.messages()
        .slice(0, -1)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      this.http
        .post('http://localhost:8000/api/chat', {
          message: text,
          token: token,
          history: history,
        })
        .pipe
        // Ensure we clean up loading if error
        ()
        .subscribe({
          next: (res: any) => {
            const quickReplies = this.extractQuickReplies(res.reply || '');
            this.messages.update((m) => [
              ...m,
              {
                role: 'model',
                content: res.reply,
                products: res.products || null,
                quickReplies: quickReplies.length ? quickReplies : undefined,
              },
            ]);
            this.isLoading.set(false);
          },
          error: (err) => {
            this.messages.update((m) => [
              ...m,
              {
                role: 'model',
                content: 'Xin lỗi, AI đang gặp sự cố kết nối. Vui lòng thử lại sau.',
              },
            ]);
            this.isLoading.set(false);
          },
        });
    });
  }
}
