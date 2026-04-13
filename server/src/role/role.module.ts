import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from '../users/entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleController } from './role.controller';

@Module({
  providers: [RoleService],
  controllers: [RoleController],
  imports: [TypeOrmModule.forFeature([Role])],
})
export class RoleModule implements OnApplicationBootstrap {
  constructor(private readonly roleService: RoleService) {}

  async onApplicationBootstrap() {
    await this.roleService.runSeeding();
  }
}
