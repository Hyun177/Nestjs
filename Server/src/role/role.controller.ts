// src/role/role.controller.ts
import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';

@ApiTags('Roles')
@Controller('role')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Permissions(Permission.ROLE_MANAGE)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new role (admin only)' })
  async createRole(@Body('name') name: string) {
    return this.roleService.createRole(name);
  }

  @Post('assign-permissions/:roleName')
  @ApiOperation({ summary: 'Assign permissions to a role (admin only)' })
  async assignPermissions(
    @Param('roleName') roleName: string,
    @Body() body: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(roleName, body.permissions);
  }

  @Post('grant-all/:roleName')
  @ApiOperation({ summary: 'Grant ALL permissions to a role (admin only)' })
  async grantAllPermissions(@Param('roleName') roleName: string) {
    const allPermissions = Object.values(Permission);
    return this.roleService.assignPermissions(roleName, allPermissions);
  }

  @Post('assign-role/:userEmail/:roleName')
  @ApiOperation({ summary: 'Assign a role to a user (admin only)' })
  async assignRoleToUser(
    @Param('userEmail') userEmail: string,
    @Param('roleName') roleName: string,
  ) {
    return this.roleService.assignRoleToUser(userEmail, roleName);
  }

  @Get()
  @ApiOperation({ summary: 'List all roles with permissions (admin only)' })
  async listRoles() {
    return this.roleService.listRoles();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions (admin only)' })
  getAllPermissions() {
    return this.roleService.getAllPermissions();
  }

  @Get(':roleName')
  @ApiOperation({ summary: 'Get a specific role with permissions (admin only)' })
  async getRole(@Param('roleName') roleName: string) {
    return this.roleService.getRoleWithPermissions(roleName);
  }
}
