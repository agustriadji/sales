export const PROMO_READ_REPOSITORY = 'PROMO_READ_REPOSITORY';
export const PROMOTION_SERVICE = 'PROMOTION_SERVICE';

export type MonetaryBenefitType = 'AMOUNT' | 'PERCENTAGE';

export type PromoType = 'FLS' | 'PKWO';

export enum PromoTypes {
  FlashSale = 'FLS',
  Regular = 'PKWO',
}

export enum UomTypeEnum {
  BASE = 'BASE',
  INTERMEDIATE = 'INTERMEDIATE',
  PACK = 'PACK',
}

export type FlashSaleStatus = 'ACTIVE' | 'UPCOMING';
export enum FlashSaleStatusEnum {
  ACTIVE = 'ACTIVE',
  UPCOMING = 'UPCOMING',
}

export enum PromoPriorityTypes {
  MAX_PRIORITY = -999,
  MIN_PRIORITY = 999,
}
