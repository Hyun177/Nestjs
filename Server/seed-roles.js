/**
 * Seed script — create roles & assign permissions in the database.
 * Run once: node seed-roles.js
 *
 * Roles:
 *  admin    – full access
 *  manager  – manage products/categories/brands/orders, view users
 *  customer – place orders, browse shop
 *  guest    – read-only browse (useful if you add public JWT later)
 */
const mysql = require('mysql2/promise');

const DB = {
  host: '127.0.0.1',
  user: 'root',
  password: 'huyblue123',
  database: 'nestjs_db',
};

// Must match Permission enum values in auth/permission/permissions.enum.ts
const ALL_PERMISSIONS = [
  'product:create',
  'product:read',
  'product:update',
  'product:delete',
  'category:create',
  'category:read',
  'category:update',
  'category:delete',
  'brand:create',
  'brand:read',
  'brand:update',
  'brand:delete',
  'user:read',
  'user:create',
  'user:update',
  'user:delete',
  'order:create',
  'order:read',
  'order:update',
  'order:delete',
  'post:create',
  'post:read',
  'post:update',
  'post:delete',
  'role:manage',
  'voucher:create',
  'voucher:read',
  'voucher:update',
  'voucher:delete',
  'cart:create',
  'cart:read',
  'cart:update',
  'cart:delete',
  'payment:create',
  'payment:read',
  'payment:update',
  'payment:delete',
  'review:create',
  'review:read',
  'review:update',
  'review:delete',
  'voucher:apply',
];

const ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  manager: [
    'product:create',
    'product:read',
    'product:update',
    'product:delete',
    'category:create',
    'category:read',
    'category:update',
    'category:delete',
    'brand:create',
    'brand:read',
    'brand:update',
    'brand:delete',
    'order:read',
    'order:update',
    'user:read',
    'post:create',
    'post:read',
    'post:update',
    'post:delete',
    'voucher:create',
    'voucher:read',
    'voucher:update',
    'voucher:delete',
    'voucher:apply',
  ],
  user: [
    'product:read',
    'category:read',
    'brand:read',
    'order:create',
    'order:read',
    'post:read',
    'post:create',
    'post:update',
    'post:delete',
    'voucher:read',
    'cart:create',
    'cart:read',
    'cart:update',
    'cart:delete',
    'payment:create',
    'payment:read',
    'payment:update',
    'payment:delete',
    'review:create',
    'review:read',
    'review:update',
    'review:delete',
    'voucher:apply',
  ],
  guest: ['product:read', 'category:read', 'brand:read', 'post:read'],
};

async function seed() {
  const conn = await mysql.createConnection(DB);
  console.log('✅ Connected to', DB.database);

  try {
    // 1. Upsert all permissions
    for (const name of ALL_PERMISSIONS) {
      await conn.execute(
        'INSERT INTO permissions (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name',
        [name],
      );
    }
    console.log(`✅ Upserted ${ALL_PERMISSIONS.length} permissions`);

    // 2. Upsert roles
    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
      await conn.execute(
        'INSERT INTO roles (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name',
        [roleName],
      );
    }
    console.log(`✅ Upserted ${Object.keys(ROLE_PERMISSIONS).length} roles`);

    // 3. Assign permissions to roles via role_permission table
    for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
      const [[role]] = await conn.execute(
        'SELECT id FROM roles WHERE name = ?',
        [roleName],
      );
      if (!role) {
        console.warn(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      // Remove old mappings for this role then re-insert (idempotent)
      await conn.execute('DELETE FROM role_permission WHERE rolesId = ?', [
        role.id,
      ]);

      for (const permName of perms) {
        const [[perm]] = await conn.execute(
          'SELECT id FROM permissions WHERE name = ?',
          [permName],
        );
        if (!perm) {
          console.warn(`⚠️  Permission not found: ${permName}`);
          continue;
        }
        await conn.execute(
          'INSERT IGNORE INTO role_permission (rolesId, permissionsId) VALUES (?, ?)',
          [role.id, perm.id],
        );
      }
      console.log(`✅ Role '${roleName}' → ${perms.length} permissions`);
    }

    console.log('\n🎉 Seeding complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

seed();
