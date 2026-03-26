/**
 * Seed script — create roles & assign permissions in the database.
 * Run once: node seed-roles.js
 */
const mysql = require('mysql2/promise');

const DB = {
  host: '127.0.0.1',
  user: 'root',
  password: 'huyblue123',
  database: 'nestjs_db',
};

const ALL_PERMISSIONS = [
  // Product
  'product:create',
  'product:read',
  'product:update',
  'product:delete',

  // Category
  'category:create',
  'category:read',
  'category:update',
  'category:delete',

  // Brand
  'brand:create',
  'brand:read',
  'brand:update',
  'brand:delete',

  // User
  'user:read',
  'user:create',
  'user:update',
  'user:delete',

  // Post
  'post:create',
  'post:read',
  'post:update',
  'post:delete',

  // Voucher
  'voucher:create',
  'voucher:read',
  'voucher:update',
  'voucher:delete',
  'voucher:apply',

  // Cart
  'cart:create',
  'cart:read',
  'cart:update',
  'cart:delete',

  // Payment
  'payment:create',
  'payment:read',
  'payment:update',
  'payment:delete',
  'payment:cancel',
  'payment:refund',
  'payment:manage',

  // Review
  'review:create',
  'review:read',
  'review:update',
  'review:delete',
  'review:approve',

  // Order
  'order:create',
  'order:read',
  'order:update',
  'order:delete',
  'order:cancel',
  'order:manage',
  'order:ship',
  'order:deliver',

  // Role/Permission
  'role:manage',
  'permission:manage',
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
    'order:manage',
    'order:ship',
    'user:read',
    'voucher:create',
    'voucher:read',
    'voucher:update',
    'voucher:delete',
    'payment:read',
    'payment:manage',
  ],
  customer: [
    'product:read',
    'category:read',
    'brand:read',
    'cart:create',
    'cart:read',
    'cart:update',
    'cart:delete',
    'order:create',
    'order:read',
    'order:cancel',
    'payment:create',
    'payment:read',
    'review:create',
    'review:read',
    'review:update',
    'review:delete',
    'voucher:read',
    'voucher:apply',
  ],
  user: [
    'product:read',
    'category:read',
    'brand:read',
    'cart:create',
    'cart:read',
    'cart:update',
    'cart:delete',
    'order:create',
    'order:read',
    'order:cancel',
    'payment:create',
    'payment:read',
    'review:create',
    'review:read',
    'review:update',
    'review:delete',
    'voucher:read',
    'voucher:apply',
  ],
  guest: [
    'product:read',
    'category:read',
    'brand:read',
    'post:read',
    'review:read',
  ],
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
        console.warn(`⚠️ Role not found: ${roleName}`);
        continue;
      }

      // Clear existing for idempotency
      await conn.execute('DELETE FROM role_permission WHERE rolesId = ?', [
        role.id,
      ]);

      for (const permName of perms) {
        const [[perm]] = await conn.execute(
          'SELECT id FROM permissions WHERE name = ?',
          [permName],
        );
        if (!perm) {
          console.warn(`⚠️ Permission not found: ${permName}`);
          continue;
        }
        await conn.execute(
          'INSERT IGNORE INTO role_permission (rolesId, permissionsId) VALUES (?, ?)',
          [role.id, perm.id],
        );
      }
      console.log(`✅ Role '${roleName}' -> ${perms.length} permissions`);
    }

    console.log('\n🎉 Seeding complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await conn.end();
  }
}

seed();
