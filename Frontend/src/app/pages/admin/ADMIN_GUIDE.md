# Admin Dashboard - Hỗ Trợ Quản Lý Toàn Bộ Hệ Thống

## 📋 Giới Thiệu

Trang Admin Dashboard là một trang quản lý toàn diện, được xây dựng bằng **Angular 21**, **ng-zorro-antd** (Ant Design) và **Tailwind CSS**. Trang này cung cấp một giao diện hiện đại, đẹp và dễ sử dụng để quản lý toàn bộ hệ thống.

## ✨ Tính Năng Chính

### 1. **Dashboard Trực Quan**

- Thống kê tổng quan (Total Users, Orders, Products, Revenue)
- Biểu đồ xu hướng bán hàng
- Danh sách đơn hàng gần đây
- Danh sách sản phẩm bán chạy
- Trạng thái hệ thống
- Thiệt kế đẹp với hình ảnh, biểu tượng và màu sắc hấp dẫn

### 2. **Quản Lý Người Dùng**

- Danh sách tất cả người dùng trong hệ thống
- Tìm kiếm, lọc theo email, số điện thoại
- Thêm, chỉnh sửa, xóa người dùng
- Hiển thị avatar, vai trò (customer/admin/moderator)
- Trạng thái người dùng (active/inactive/blocked)
- Thống kê đơn hàng và tổng chi tiêu của mỗi người dùng
- Phân trang

### 3. **Quản Lý Đơn Hàng**

- Danh sách tất cả đơn hàng
- Tìm kiếm theo mã đơn hàng, tên khách hàng, email
- Lọc theo trạng thái (Chờ xử lý, Đang giao, Hoàn thành, Đã hủy)
- Xem chi tiết đơn hàng
- Hiển thị thông tin khách hàng, sản phẩm, giá, ngày tạo
- In đơn hàng, gửi email
- Chia sẻ trạng thái thanh toán và vận chuyển

### 4. **Quản Lý Sản Phẩm**

- Danh sách sản phẩm với hình ảnh
- Tìm kiếm theo tên, SKU, thương hiệu
- Thêm, chỉnh sửa, xóa sản phẩm
- Quản lý giá, giá gốc, số lượng kho
- SKU (mã sản phẩm) duy nhất
- Danh mục, thương hiệu
- Đánh giá sao và số lượng review
- Trạng thái sản phẩm (Đang bán, Ẩn, Hết hàng)
- Hiển thị tình trạng kho (Có sẵn, Sắp hết, Hạn chế, Hết hàng)

### 5. **Quản Lý Danh Mục**

- Danh sách danh mục sản phẩm
- Tìm kiếm theo tên hoặc slug
- Thêm, chỉnh sửa, xóa danh mục
- Slug tự động cho URL
- Mô tả danh mục
- Đếm số lượng sản phẩm trong mỗi danh mục
- Trạng thái hoạt động (active/inactive)

### 6. **Quản Lý Thương Hiệu**

- Danh sách tất cả thương hiệu
- Tìm kiếm theo tên hoặc slug
- Thêm, chỉnh sửa, xóa thương hiệu
- Logo thương hiệu
- Mô tả chi tiết
- Đếm số sản phẩm của mỗi thương hiệu
- Trạng thái hoạt động

## 🎨 Giao Diện & Thiết Kế

- **Layout**: Sidebar navigation + Main content area
- **Colors**: Sử dụng Ant Design color scheme (Blue primary, Green success, Red error, etc.)
- **Responsive**: Tối ưu hóa cho desktop, tablet, mobile
- **Icons**: Sử dụng Ant Design Icons
- **Components**:
  - Tables with sorting, pagination, search
  - Forms with validation
  - Modals for CRUD operations
  - Tags, avatars, badges
  - Statistics cards with trends
  - Tooltips, popovers, confirmations

## 📁 Cấu Trúc Tệp

```
src/app/
├── layout/
│   ├── admin-layout/               # Layout chính của admin
│   │   ├── admin-layout.component.ts
│   │   ├── admin-layout.component.html
│   │   └── admin-layout.component.scss
│   └── ...
├── pages/
│   ├── admin/
│   │   ├── dashboard/              # Dashboard chính
│   │   │   ├── admin-dashboard.component.ts
│   │   │   ├── admin-dashboard.component.html
│   │   │   └── admin-dashboard.component.scss
│   │   ├── users/                  # Quản lý người dùng
│   │   │   ├── admin-users.component.ts
│   │   │   ├── admin-users.component.html
│   │   │   └── admin-users.component.scss
│   │   ├── orders/                 # Quản lý đơn hàng
│   │   │   ├── admin-orders.component.ts
│   │   │   ├── admin-orders.component.html
│   │   │   └── admin-orders.component.scss
│   │   ├── products/               # Quản lý sản phẩm
│   │   │   ├── admin-products.component.ts
│   │   │   ├── admin-products.component.html
│   │   │   └── admin-products.component.scss
│   │   ├── categories/             # Quản lý danh mục
│   │   │   ├── admin-categories.component.ts
│   │   │   ├── admin-categories.component.html
│   │   │   └── admin-categories.component.scss
│   │   └── brands/                 # Quản lý thương hiệu
│   │       ├── admin-brands.component.ts
│   │       ├── admin-brands.component.html
│   │       └── admin-brands.component.scss
│   └── ...
└── ...
```

## 🚀 Cách Sử Dụng

### 1. Truy Cập Admin Dashboard

- URL: `http://localhost:4200/admin`
- Cần phải **đăng nhập với tài khoản admin hoặc manager**
- Dashboard sẽ được hiển thị nếu quyền hợp lệ

### 2. Điều Hướng

- Sử dụng **sidebar menu** để điều hướng giữa các trang
- Bấm vào **hamburger icon** để thu/giãn sidebar trên desktop
- Sidebar sẽ tự động ẩn/hiện trên mobile

### 3. Tìm Kiếm & Lọc

- Sử dụng **search box** ở đầu trang để tìm kiếm
- Sử dụng **dropdown filters** để lọc dữ liệu
- Kết quả được cập nhật realtime

### 4. CRUD Operations

- **Thêm mới**: Bấm nút "+ Thêm..."
- **Chỉnh sửa**: Bấm icon **edit** (bút viết)
- **Xóa**: Bấm icon **delete** (thùng rác) và xác nhận

### 5. Xem Chi Tiết

- Click vào bất kỳ item nào để xem chi tiết
- Modals sẽ hiện ra với toàn bộ thông tin

## 🔒 Bảo Mật

- **Path**: `/admin/*` được bảo vệ bởi `roleGuard`
- Chỉ người dùng có role `admin` hoặc `manager` mới có thể truy cập
- Redirect tự động nếu không có quyền

## ⚙️ Công Nghệ Sử Dụng

- **Framework**: Angular 21
- **UI Library**: ng-zorro-antd (Ant Design for Angular)
- **Styling**: Tailwind CSS + SCSS
- **State Management**: Angular Signals (Reactive)
- **Form**: Reactive Forms
- **HTTP**: HttpClient
- **Routing**: Angular Router

## 📊 Dữ Liệu Mẫu

Tất cả các component đều có dữ liệu mẫu để bạn có thể kiểm tra ngay:

- Dashboard: 20+ records across multiple categories
- Users: 5+ users with different roles
- Orders: 5+ orders with various statuses
- Products: 4+ products with images and ratings
- Categories: 4+ categories
- Brands: 4+ brands

## 🔌 Tích Hợp API

### Hiện tại:

- Các dữ liệu là mock data trong `signal`

### Để tích hợp API thực tế:

Hãy thay thế phần `loadXxx()` trong mỗi component:

```typescript
// Thay vì mock data, gọi service
loadUsers() {
  this.loading.set(true);
  this.userService.getAll().subscribe({
    next: (users) => {
      this.users.set(users);
      this.filterUsers();
      this.loading.set(false);
    },
    error: (error) => {
      console.error('Error loading users:', error);
      this.loading.set(false);
    }
  });
}
```

## 🎯 Khuyến Cáo Tiếp Theo

1. **Tích hợp API**: Kết nối với các service backend
2. **Xác thực**: Thêm token handling choAPI calls
3. **Kỳ Vọng**: Thêm validation thêm vào forms
4. **Export**: Thêm export PDF/Excel cho báo cáo
5. **Charts**: Tích hợp thư viện chart (ng2-charts, ECharts)
6. **Filters**: Thêm filter nâng cao với date ranges, numeric ranges
7. **Bulk Actions**: Xóa/cập nhật nhiều items cùng lúc
8. **Permissions**: Role-based actions (hiện/ẩn buttons dựa trên permissions)

## 📝 Ghi Chú

- Tất cả icons sử dụng **Ant Design Icons** từ `@ant-design/icons-angular`
- Responsive design được test trên:
  - Desktop (1920x1080, 1366x768)
  - Tablet (768px, 980px)
  - Mobile (375px, 480px)
- Pagination mặc định: 10 items per page
- Locale: Tiếng Việt

## 🤝 Support

Nếu bạn cần thêm các tính năng khác hoặc sửa đổi gì, hãy liên hệ hoặc tạo issue trong project.

---

**Last Updated**: 25/03/2024
