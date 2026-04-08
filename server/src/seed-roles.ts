import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RoleService } from './role/role.service';
import { RoleEnum } from './role/role.enum';
import { Permission } from './auth/permission/permissions.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const roleService = app.get(RoleService);

  const roles = Object.values(RoleEnum);
  console.log('Seeding roles and permissions:', roles);

  // ── Define Permission Groupings ──────────────────

  const commonUserPerms = [
    Permission.PRODUCT_READ,
    Permission.CATEGORY_READ,
    Permission.BRAND_READ,
    Permission.POST_READ,
    Permission.CART_CREATE,
    Permission.CART_READ,
    Permission.CART_UPDATE,
    Permission.CART_DELETE,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_CANCEL,
    Permission.REVIEW_CREATE,
    Permission.REVIEW_READ,
    Permission.VOUCHER_READ,
    Permission.VOUCHER_APPLY,
    Permission.SELLER_REQUEST_CREATE,
  ];

  const sellerPerms = [
    ...commonUserPerms,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.ORDER_UPDATE,
    Permission.ORDER_SHIP,
    Permission.SHOP_READ,
    Permission.SHOP_UPDATE,
    Permission.SHOP_MANAGE,
  ];

  const managerPerms = [
    ...commonUserPerms,
    Permission.PRODUCT_UPDATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_CANCEL,
    Permission.ORDER_MANAGE,
    Permission.USER_READ,
    Permission.SELLER_REQUEST_READ,
    Permission.SELLER_REQUEST_APPROVE,
    Permission.SELLER_REQUEST_REJECT,
    Permission.REVIEW_APPROVE,
    Permission.REVIEW_DELETE,
  ];

  const allPerms = Object.values(Permission);

  const roleAssignments: Record<RoleEnum, Permission[]> = {
    [RoleEnum.USER]: commonUserPerms,
    [RoleEnum.SELLER]: sellerPerms,
    [RoleEnum.MANAGER]: managerPerms,
    [RoleEnum.ADMIN]: allPerms,
  };

  for (const roleName of roles) {
    try {
      await roleService.createRole(roleName);
      console.log(`- Role "${roleName}" ensured.`);

      const perms = roleAssignments[roleName as RoleEnum];
      if (perms) {
        await roleService.assignPermissions(roleName, perms);
        console.log(
          `  -> Assigned ${perms.length} permissions to "${roleName}".`,
        );
      }
    } catch (e) {
      console.error(
        `- Failed to seed role/perms for "${roleName}":`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  console.log('Seeding finished.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
