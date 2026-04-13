import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewService],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
