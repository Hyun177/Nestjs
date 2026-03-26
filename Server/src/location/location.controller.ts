import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as provinces from '../common/types/province.json';
import * as wards from '../common/types/ward.json';

@ApiTags('location')
@Controller('location')
export class LocationController {
  @Get('provinces')
  getProvinces() {
    return Object.values(provinces).map((p: any) => ({
      code: p.code,
      name: p.name_with_type,
    }));
  }

  @Get('wards/:provinceCode')
  getWards(@Param('provinceCode') provinceCode: string) {
    const result = Object.values(wards as any).filter(
      (w: any) => w.parent_code === provinceCode,
    );
    return result.map((w: any) => ({
      code: w.code,
      name: w.name_with_type,
    }));
  }
}
