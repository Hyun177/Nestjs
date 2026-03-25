import { Component, inject, signal, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { UserService } from '../../../core/services/user.service';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  status: string;
  createdAt: string;
  orders: number;
  totalSpent: number;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzSpaceModule,
    NzTagModule,
    NzAvatarModule,
    NzInputNumberModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzPaginationModule,
    NzBreadCrumbModule,
    NzDividerModule,
    NzEmptyModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('totalTemplate') totalTemplate!: TemplateRef<any>;
  private fb = inject(FormBuilder);

  private userService = inject(UserService);

  loading = signal(false);
  isModalVisible = signal(false);
  isEditMode = signal(false);
  searchValue = signal('');
  pageIndex = signal(1);
  pageSize = signal(10);

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);

  userForm = this.fb.group({
    id: [0],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    role: ['customer', [Validators.required]],
    status: ['active', [Validators.required]],
  });

  columns = [
    { title: 'Người dùng', width: '20%' },
    { title: 'Email', width: '18%' },
    { title: 'Điện thoại', width: '12%' },
    { title: 'Vai trò', width: '10%' },
    { title: 'Trạng thái', width: '10%' },
    { title: 'Đơn hàng', width: '8%' },
    { title: 'Tổng chi tiêu', width: '12%' },
    { title: 'Thao tác', width: '10%' },
  ];

  roleOptions = [
    { label: 'Customer', value: 'customer' },
    { label: 'Admin', value: 'admin' },
    { label: 'Moderator', value: 'moderator' },
  ];

  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Blocked', value: 'blocked' },
  ];

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (data: any[]) => {
        const parsedUsers = (data || []).map((u: any) => ({
          id: u.id,
          name: u.firstname ? `${u.firstname} ${u.lastname}`.trim() : u.email,
          email: u.email,
          phone: u.phone || 'Chưa cập nhật',
          avatar: u.avatar ? 'http://localhost:3000' + u.avatar : 'https://api.realworld.io/images/demo-avatar.jpg',
          role: u.roles && u.roles.length > 0 ? (u.roles[0]?.name || 'customer').toLowerCase() : 'customer',
          status: 'active', // Assuming backend doesn't have status yet
          createdAt: u.createdAt || new Date().toISOString(),
          orders: u.orders ? u.orders.length : 0,
          totalSpent: u.orders ? u.orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0) : 0,
        }));
        this.users.set(parsedUsers);
        this.filterUsers();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  filterUsers() {
    const search = this.searchValue().toLowerCase();
    const filtered = this.users().filter(
      (user) =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phone.includes(search),
    );
    this.filteredUsers.set(filtered);
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.userForm.reset({ role: 'customer', status: 'active' });
    this.isModalVisible.set(true);
  }

  openEditModal(user: User) {
    this.isEditMode.set(true);
    this.userForm.patchValue({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    this.isModalVisible.set(true);
  }

  handleOk() {
    if (this.userForm.valid) {
      const formValue = this.userForm.getRawValue() as Partial<User>;
      this.loading.set(true);

      if (this.isEditMode()) {
        const payload = {
          firstname: formValue.name?.split(' ')[0] || '',
          lastname: formValue.name?.split(' ').slice(1).join(' ') || '',
          email: formValue.email,
          phone: formValue.phone,
          // role and status mapped if needed
        };
        this.userService.updateUserAdmin(formValue.id!, payload).subscribe({
          next: () => {
            this.loadUsers();
            this.isModalVisible.set(false);
          },
          error: () => this.loading.set(false)
        });
      } else {
        const payload = {
          firstname: formValue.name?.split(' ')[0] || '',
          lastname: formValue.name?.split(' ').slice(1).join(' ') || '',
          email: formValue.email,
          phone: formValue.phone,
          password: 'Password123!', // Default password for newly created admins/users
          // roles logic can be passed here
        };
        this.userService.createUserAdmin(payload).subscribe({
          next: () => {
            this.loadUsers();
            this.isModalVisible.set(false);
          },
          error: () => this.loading.set(false)
        });
      }
    }
  }

  handleCancel() {
    this.isModalVisible.set(false);
  }

  deleteUser(id: number) {
    if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
      this.loading.set(true);
      this.userService.deleteUserAdmin(id).subscribe({
        next: () => this.loadUsers(),
        error: () => this.loading.set(false)
      });
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  }

  onSearch(value: string) {
    this.searchValue.set(value);
    this.pageIndex.set(1);
    this.filterUsers();
  }

  getRoleColor(role: string) {
    const roleColors: { [key: string]: string } = {
      admin: 'red',
      customer: 'blue',
      moderator: 'orange',
    };
    return roleColors[role] || 'default';
  }

  getStatusColor(status: string) {
    const statusColors: { [key: string]: string } = {
      active: 'success',
      inactive: 'default',
      blocked: 'error',
    };
    return statusColors[status] || 'default';
  }
}
