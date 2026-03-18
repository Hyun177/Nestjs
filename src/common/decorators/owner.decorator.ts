import { SetMetadata } from '@nestjs/common';

export const OWNER_KEY = 'owner';

export interface OwnerConfig {
  entity: string;
  paramKey: string;
  ownerField: string;
}

export const Owner = (config: OwnerConfig) => SetMetadata(OWNER_KEY, config);
