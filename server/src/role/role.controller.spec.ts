import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('RoleController', () => {
  let controller: RoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
    }).compile();

    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
