import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from './types/user-payload.type';
import { UserAddress } from './entities/user-address.entity';

@ApiTags('address')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  getAll(@Req() req: RequestWithUser) {
    return this.addressService.getAddresses(req.user.userId);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: Partial<UserAddress>) {
    return this.addressService.createAddress(req.user.userId, dto);
  }

  @Put(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<UserAddress>,
  ) {
    return this.addressService.updateAddress(id, req.user.userId, dto);
  }

  @Delete(':id')
  delete(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.addressService.deleteAddress(id, req.user.userId);
  }

  @Patch(':id/default')
  setDefault(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressService.setDefault(id, req.user.userId);
  }
}
