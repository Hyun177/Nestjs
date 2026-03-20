// src/role/dto/assign-permissions.dto.ts
import { IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PermissionEnum } from '../permissions.enum';

export class AssignPermissionsDto {
  @ApiProperty({
    enum: PermissionEnum,
    isArray: true,
    description: 'Permissions to assign to the role',
  })
  @IsArray()
  @IsEnum(PermissionEnum, { each: true })
  permissions: PermissionEnum[];
}
