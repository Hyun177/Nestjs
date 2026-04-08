import { CreateCategoryDto } from './create-category.dto';
import { describe, it, expect } from '@jest/globals';

describe('CreateCategoryDto', () => {
  it('should be defined', () => {
    expect(new CreateCategoryDto()).toBeDefined();
  });
});
