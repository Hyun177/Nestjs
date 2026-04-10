import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, ContactRequest } from '../../../core/services/contact.service';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NzTableModule, 
    NzTagModule, 
    NzButtonModule, 
    NzModalModule, 
    NzIconModule,
    NzInputModule
  ],
  templateUrl: './admin-support.component.html',
  styleUrls: ['./admin-support.component.scss'],
  providers: [NzModalService]
})
export class AdminSupportComponent implements OnInit {
  private contactService = inject(ContactService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private cdr = inject(ChangeDetectorRef);

  requests: ContactRequest[] = [];
  loading = false;
  
  replyModalVisible = false;
  selectedRequest?: ContactRequest;
  replyText = '';
  isReplying = false;
  searchTerm = '';

  ngOnInit() {
    this.loadRequests();
  }

  get filteredRequests() {
    if (!this.searchTerm.trim()) return this.requests;
    const term = this.searchTerm.toLowerCase();
    return this.requests.filter(r => 
      r.name.toLowerCase().includes(term) || 
      r.email.toLowerCase().includes(term)
    );
  }

  loadRequests() {
    this.loading = true;
    this.cdr.detectChanges();
    this.contactService.getRequests().subscribe({
      next: (res) => {
        this.requests = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.message.error('Không thể tải danh sách yêu cầu hỗ trợ');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openReply(request: ContactRequest) {
    this.selectedRequest = request;
    this.replyText = request.replyMessage || '';
    this.replyModalVisible = true;
  }

  submitReply() {
    if (!this.selectedRequest?.id || !this.replyText.trim()) return;

    this.isReplying = true;
    this.contactService.replyToRequest(this.selectedRequest.id, this.replyText).subscribe({
      next: () => {
        this.message.success('Đã gửi phản hồi thành công');
        this.replyModalVisible = false;
        this.loadRequests();
        this.isReplying = false;
      },
      error: () => {
        this.message.error('Gửi phản hồi thất bại');
        this.isReplying = false;
      }
    });
  }

  deleteRequest(id: number) {
    this.modal.confirm({
      nzTitle: 'Xác nhận xóa',
      nzContent: 'Bạn có chắc chắn muốn xóa yêu cầu hỗ trợ này?',
      nzOnOk: () => {
        this.contactService.deleteRequest(id).subscribe({
          next: () => {
            this.message.success('Đã xóa thành công');
            this.loadRequests();
          },
          error: () => this.message.error('Xóa thất bại')
        });
      }
    });
  }
}
