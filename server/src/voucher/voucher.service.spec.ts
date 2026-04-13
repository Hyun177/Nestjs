import { Test, TestingModule } from '@nestjs/testing';
import { VoucherService } from './voucher.service';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('VoucherService', () => {
  let service: VoucherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoucherService],
    }).compile();

    service = module.get<VoucherService>(VoucherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
