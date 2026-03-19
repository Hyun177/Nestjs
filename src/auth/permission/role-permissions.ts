export const ROLE_PERMISSIONS: Record<'admin' | 'user' | 'editor', string[]> = {
  admin: ['product:create', 'product:read', 'product:update', 'product:delete'],
  user: ['product:read'],
  editor: ['product:read', 'product:update'],
};
