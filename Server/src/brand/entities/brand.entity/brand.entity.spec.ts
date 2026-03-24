import { Brand } from './brand.entity';

describe('BrandEntity', () => {
  it('should be defined', () => {
    expect(new Brand()).toBeDefined();
  });
});
