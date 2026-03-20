// src/role/role.controller.ts
import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { RoleService } from './role.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Roles')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new role' })
  async createRole(@Body('name') name: string) {
    return this.roleService.createRole(name);
  }

  @Post('assign-permissions/:roleName')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  async assignPermissions(
    @Param('roleName') roleName: string,
    @Body() body: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(roleName, body.permissions);
  }

  @Post('assign-role/:userEmail/:roleName')
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignRoleToUser(
    @Param('userEmail') userEmail: string,
    @Param('roleName') roleName: string,
  ) {
    return this.roleService.assignRoleToUser(userEmail, roleName);
  }

  @Get(':roleName')
  @ApiOperation({ summary: 'Get role with permissions and users' })
  async getRole(@Param('roleName') roleName: string) {
    return this.roleService.getRoleWithPermissions(roleName);
  }

  @Get()
  @ApiOperation({ summary: 'Get all available permissions' })
  getAllPermissions() {
    return this.roleService.getAllPermissions();
  }
}
