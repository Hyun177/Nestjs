import { CreateBrandDto } from './create-brand.dto';
import { describe, it, expect } from '@jest/globals';

describe('CreateBrandDto', () => {
  it('should be defined', () => {
    expect(new CreateBrandDto()).toBeDefined();
  });
});
