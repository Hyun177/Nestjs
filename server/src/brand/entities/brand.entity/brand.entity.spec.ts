import { Brand } from './brand.entity';
import { describe, it, expect } from '@jest/globals';

describe('BrandEntity', () => {
  it('should be defined', () => {
    expect(new Brand()).toBeDefined();
  });
});
