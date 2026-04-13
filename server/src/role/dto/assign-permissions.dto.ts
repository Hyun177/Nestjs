import { IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../auth/permission/permissions.enum';

export class AssignPermissionsDto {
  @ApiProperty({
    enum: Permission,
    isArray: true,
    description: 'Permissions to assign to the role',
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];
}
