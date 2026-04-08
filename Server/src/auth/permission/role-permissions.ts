import { Permission } from './permissions.enum';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(Permission) as Permission[],

  manager: [
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_READ,
    Permission.CATEGORY_UPDATE,
    Permission.CATEGORY_DELETE,
    Permission.BRAND_CREATE,
    Permission.BRAND_READ,
    Permission.BRAND_UPDATE,
    Permission.BRAND_DELETE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.USER_READ,
    Permission.POST_CREATE,
    Permission.POST_READ,
    Permission.POST_UPDATE,
    Permission.POST_DELETE,
  ],

  customer: [
    Permission.PRODUCT_READ,
    Permission.CATEGORY_READ,
    Permission.BRAND_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.POST_READ,
    Permission.POST_CREATE, // customer được tạo/sửa/xoá bài của chính mình (PostOwnershipGuard)
    Permission.POST_UPDATE,
    Permission.POST_DELETE,
  ],

  guest: [
    Permission.PRODUCT_READ,
    Permission.CATEGORY_READ,
    Permission.BRAND_READ,
    Permission.POST_READ,
  ],
};
