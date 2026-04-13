import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';
import type { RequestWithUser } from '../common/types/request-with-user';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('voucher')
@ApiBearerAuth('accessToken')
@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyVouchers(@Req() req: RequestWithUser) {
    return this.voucherService.getUserVouchers(req.user.userId);
  }

  @Get('public')
  @UseGuards(JwtAuthGuard)
  getPublicVouchers(@Req() req: RequestWithUser) {
    return this.voucherService.getPublicVouchers(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.VOUCHER_CREATE)
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.voucherService.create(createVoucherDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.VOUCHER_READ)
  findAll() {
    return this.voucherService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.VOUCHER_READ)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.VOUCHER_UPDATE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVoucherDto: UpdateVoucherDto,
  ) {
    return this.voucherService.update(id, updateVoucherDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(Permission.VOUCHER_DELETE)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.remove(id);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  apply(
    @Body('code') code: string,
    @Body('itemIds') itemIds: number[],
    @Req() req: RequestWithUser,
  ) {
    return this.voucherService.applyVoucher(req.user.userId, code, itemIds);
  }

  @Post('collect')
  @UseGuards(JwtAuthGuard)
  collectVoucher(
    @Body('voucherId', ParseIntPipe) voucherId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.voucherService.collectVoucher(req.user.userId, voucherId);
  }
}
