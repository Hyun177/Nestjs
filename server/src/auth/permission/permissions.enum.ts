/**
 * Unified permission enum for the e-commerce platform.
 * Format: resource:action (e.g. product:create)
 */
export enum Permission {
  // ── Product ──────────────────────────────────────
  PRODUCT_CREATE = 'product:create',
  PRODUCT_READ = 'product:read',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',

  // ── Category ─────────────────────────────────────
  CATEGORY_CREATE = 'category:create',
  CATEGORY_READ = 'category:read',
  CATEGORY_UPDATE = 'category:update',
  CATEGORY_DELETE = 'category:delete',

  // ── Brand ────────────────────────────────────────
  BRAND_CREATE = 'brand:create',
  BRAND_READ = 'brand:read',
  BRAND_UPDATE = 'brand:update',
  BRAND_DELETE = 'brand:delete',

  // ── User management ──────────────────────────────
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // ── Post (blog / tin tức) ─────────────────────────
  POST_CREATE = 'post:create',
  POST_READ = 'post:read',
  POST_UPDATE = 'post:update',
  POST_DELETE = 'post:delete',

  // ── Voucher ──────────────────────────────────────
  VOUCHER_CREATE = 'voucher:create',
  VOUCHER_READ = 'voucher:read',
  VOUCHER_UPDATE = 'voucher:update',
  VOUCHER_DELETE = 'voucher:delete',
  VOUCHER_APPLY = 'voucher:apply',

  // ── Cart ─────────────────────────────────────────
  CART_CREATE = 'cart:create',
  CART_READ = 'cart:read',
  CART_UPDATE = 'cart:update',
  CART_DELETE = 'cart:delete',

  // ── Payment ──────────────────────────────────────
  PAYMENT_CREATE = 'payment:create',
  PAYMENT_READ = 'payment:read',
  PAYMENT_UPDATE = 'payment:update',
  PAYMENT_DELETE = 'payment:delete',
  PAYMENT_CANCEL = 'payment:cancel',
  PAYMENT_REFUND = 'payment:refund',
  PAYMENT_MANAGE = 'payment:manage',

  // ── Review ───────────────────────────────────────
  REVIEW_CREATE = 'review:create',
  REVIEW_READ = 'review:read',
  REVIEW_UPDATE = 'review:update',
  REVIEW_DELETE = 'review:delete',
  REVIEW_APPROVE = 'review:approve',

  // ── Order ────────────────────────────────────────
  ORDER_CREATE = 'order:create',
  ORDER_READ = 'order:read',
  ORDER_UPDATE = 'order:update',
  ORDER_DELETE = 'order:delete',
  ORDER_CANCEL = 'order:cancel',
  ORDER_MANAGE = 'order:manage',
  ORDER_SHIP = 'order:ship',
  ORDER_DELIVER = 'order:deliver',

  // ── Role / permission management (admin only) ────
  ROLE_MANAGE = 'role:manage',
  PERMISSION_MANAGE = 'permission:manage',

  // ── Seller Request ──────────────────────────────
  SELLER_REQUEST_CREATE = 'seller_request:create',
  SELLER_REQUEST_READ = 'seller_request:read',
  SELLER_REQUEST_UPDATE = 'seller_request:update',
  SELLER_REQUEST_DELETE = 'seller_request:delete',
  SELLER_REQUEST_APPROVE = 'seller_request:approve',
  SELLER_REQUEST_REJECT = 'seller_request:reject',

  // ── Shop ────────────────────────────────────────
  SHOP_CREATE = 'shop:create',
  SHOP_READ = 'shop:read',
  SHOP_UPDATE = 'shop:update',
  SHOP_DELETE = 'shop:delete',
  SHOP_MANAGE = 'shop:manage',
}
