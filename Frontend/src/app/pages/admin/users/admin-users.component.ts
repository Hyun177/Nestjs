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
import { RoleService } from '../../../core/services/role.service';

interface User {
  id: number;
  name?: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  status: string;
  createdAt: string;
  orders: number;
  totalSpent: number;
  address?: string;
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
  private roleService = inject(RoleService);

  loading = signal(false);
  isModalVisible = signal(false);
  isEditMode = signal(false);
  searchValue = signal('');
  pageIndex = signal(1);
  pageSize = signal(10);

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  rolesList = signal<any[]>([]);

  userForm = this.fb.group({
    id: [0],
    firstname: ['', [Validators.required]],
    lastname: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: [''],
    role: ['user', [Validators.required]],
    status: ['active', [Validators.required]],
  });

  statusOptions = [
    { label: 'Hoạt động', value: 'active' },
    { label: 'Không hoạt động', value: 'inactive' },
    { label: 'Bị chặn', value: 'blocked' },
  ];

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  loadRoles() {
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.rolesList.set(roles || []);
      },
      error: (err) => console.error('Failed to load roles', err),
    });
  }

  get roleOptions() {
    return this.rolesList().map((r) => ({ label: r.name, value: r.name }));
  }

  loadUsers() {
    this.loading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (data: any[]) => {
        const parsedUsers = (data || []).map((u: any) => ({
          id: u.id,
          name: u.name || (u.firstname ? `${u.firstname} ${u.lastname}`.trim() : u.email),
          firstname: u.firstname || '',
          lastname: u.lastname || '',
          email: u.email,
          phone: u.phone || 'Chưa cập nhật',
          avatar: u.avatar
            ? 'http://localhost:3000' + u.avatar
            : 'https://api.realworld.io/images/demo-avatar.jpg',
          role: u.roles && u.roles.length > 0 ? u.roles.map((r: any) => r.name).join(', ') : 'user',
          status: u.status || 'active',
          createdAt: u.createdAt || new Date().toISOString(),
          address: u.address || '',
          orders: u.orders ? u.orders.length : 0,
          totalSpent: u.orders
            ? u.orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0)
            : 0,
        }));
        this.users.set(parsedUsers);
        this.filterUsers();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  filterUsers() {
    const search = this.searchValue().toLowerCase();
    const filtered = this.users().filter(
      (user) =>
        (user.firstname + ' ' + user.lastname).toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phone.includes(search),
    );
    this.filteredUsers.set(filtered);
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.userForm.reset({ role: 'user', status: 'active' });
    this.isModalVisible.set(true);
  }

  openEditModal(user: User) {
    this.isEditMode.set(true);
    this.userForm.patchValue({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      address: user.address || '',
      role: user.role,
      status: user.status,
    });
    this.isModalVisible.set(true);
  }

  handleOk() {
    if (this.userForm.valid) {
      const formValue = this.userForm.getRawValue() as Partial<User>;
      this.loading.set(true);

      const payload: any = {
        firstname: formValue.firstname,
        lastname: formValue.lastname,
        email: formValue.email,
        phone: formValue.phone,
        address: formValue.address,
        role: formValue.role,
        status: formValue.status,
      };

      if (this.isEditMode()) {
        this.userService.updateUserAdmin(formValue.id!, payload).subscribe({
          next: () => {
            this.loadUsers();
            this.isModalVisible.set(false);
          },
          error: () => this.loading.set(false),
        });
      } else {
        payload.password = 'Password123!';
        this.userService.createUserAdmin(payload).subscribe({
          next: () => {
            this.loadUsers();
            this.isModalVisible.set(false);
          },
          error: () => this.loading.set(false),
        });
      }
    }
  }

  handleCancel() {
    this.isModalVisible.set(false);
  }

  deleteUser(id: number) {
    this.loading.set(true);
    this.userService.deleteUserAdmin(id).subscribe({
      next: () => this.loadUsers(),
      error: () => this.loading.set(false),
    });
  }

  toggleBlock(user: User) {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    this.loading.set(true);
    this.userService.updateUserAdmin(user.id, { status: newStatus }).subscribe({
      next: () => this.loadUsers(),
      error: () => this.loading.set(false),
    });
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
    const roles = (role || '').split(',').map(r => r.trim().toLowerCase());
    if (roles.includes('admin')) return 'red';
    if (roles.includes('seller')) return 'gold';
    if (roles.includes('moderator') || roles.includes('manager')) return 'orange';
    return 'blue';
  }

  getStatusColor(status: string) {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'success';
    if (s === 'blocked') return 'error';
    return 'default';
  }
}
