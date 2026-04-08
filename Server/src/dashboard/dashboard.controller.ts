import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth('accessToken')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions(Permission.ORDER_MANAGE)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('recent-orders')
  @Permissions(Permission.ORDER_MANAGE)
  @ApiOperation({ summary: 'Get recent orders' })
  async getRecentOrders() {
    return this.dashboardService.getRecentOrders();
  }

  @Get('top-products')
  @Permissions(Permission.PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Get top sold products' })
  async getTopProducts() {
    return this.dashboardService.getTopProducts();
  }
}
