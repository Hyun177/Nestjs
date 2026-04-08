import { Test, TestingModule } from '@nestjs/testing';
import { BrandService } from './brand.service';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('BrandService', () => {
  let service: BrandService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandService],
    }).compile();

    service = module.get<BrandService>(BrandService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
