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
  BadRequestException,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { PermissionGuard } from '../auth/permission/permission.guard';
import { Permissions } from '../auth/permission/permissions.decorator';
import { Permission } from '../auth/permission/permissions.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('voucher')
@ApiBearerAuth('accessToken')
@Controller('voucher')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyVouchers(@Req() req: any) {
    return this.voucherService.getUserVouchers(req.user.id);
  }

  @Get('public')
  @UseGuards(JwtAuthGuard)
  getPublicVouchers(@Req() req: any) {
    return this.voucherService.getPublicVouchers(req.user.id);
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
  update(@Param('id', ParseIntPipe) id: number, @Body() updateVoucherDto: UpdateVoucherDto) {
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
  apply(@Body('code') code: string, @Body('itemIds') itemIds: number[], @Req() req: any) {
    return this.voucherService.applyVoucher(req.user.id, code, itemIds);
  }

  @Post('collect')
  @UseGuards(JwtAuthGuard)
  collectVoucher(@Body('voucherId') voucherId: any, @Req() req: any) {
    const id = parseInt(String(voucherId), 10);
    if (isNaN(id)) throw new BadRequestException('voucherId must be a valid number');
    return this.voucherService.collectVoucher(req.user.id, id);
  }
}
