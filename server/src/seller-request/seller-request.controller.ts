import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SellerRequestService } from './seller-request.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import type { RequestWithUser } from 'src/users/types/user-payload.type';

@Controller('seller-request')
@UseGuards(JwtAuthGuard, RoleGuard)
export class SellerRequestController {
  constructor(private readonly sellerRequestService: SellerRequestService) {}

  @Post()
  create(
    @Request() req: RequestWithUser,
    @Body() createDto: Record<string, any>,
  ) {
    return this.sellerRequestService.create(req.user.userId, createDto);
  }

  @Get('me')
  findMyRequests(@Request() req: RequestWithUser) {
    return this.sellerRequestService.findMyRequest(req.user.userId);
  }

  @Get('admin')
  @Roles('admin') // Only admin can see all requests
  findAll() {
    return this.sellerRequestService.findAll();
  }

  @Patch(':id/approve')
  @Roles('admin')
  approve(@Param('id') id: string) {
    return this.sellerRequestService.approve(+id);
  }

  @Patch(':id/reject')
  @Roles('admin')
  reject(@Param('id') id: string, @Body('rejectionReason') reason: string) {
    return this.sellerRequestService.reject(+id, reason);
  }
}
