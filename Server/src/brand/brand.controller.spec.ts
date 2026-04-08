import { Test, TestingModule } from '@nestjs/testing';
import { BrandController } from './brand.controller';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('BrandController', () => {
  let controller: BrandController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandController],
    }).compile();

    controller = module.get<BrandController>(BrandController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
