import { Division } from '@wings-corporation/core';

export interface IBannerWriteRepository {
  closeSuggestion(buyerId: string, type: Division): Promise<void>;
}
