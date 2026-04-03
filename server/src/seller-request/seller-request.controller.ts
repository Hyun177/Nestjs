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
import { RoleEnum } from '../role/role.enum';

@Controller('seller-request')
@UseGuards(JwtAuthGuard, RoleGuard)
export class SellerRequestController {
  constructor(private readonly sellerRequestService: SellerRequestService) {}

  @Post()
  create(@Request() req, @Body() createDto: any) {
    return this.sellerRequestService.create(req.user.id, createDto);
  }

  @Get('me')
  findMyRequests(@Request() req) {
    return this.sellerRequestService.findMyRequest(req.user.id);
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
