import { Test, TestingModule } from '@nestjs/testing';
import { VoucherController } from './voucher.controller';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('VoucherController', () => {
  let controller: VoucherController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoucherController],
    }).compile();

    controller = module.get<VoucherController>(VoucherController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
