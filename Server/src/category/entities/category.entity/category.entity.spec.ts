import { describe, it, expect } from '@jest/globals';
import { Category } from './category.entity';

describe('CategoryEntity', () => {
  it('should be defined', () => {
    expect(new Category()).toBeDefined();
  });
});
