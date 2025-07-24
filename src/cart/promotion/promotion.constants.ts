export const PROMO_READ_REPOSITORY = 'PROMO_READ_REPOSITORY';

export enum PromoTypes {
  FlashSale = 'FLS',
  Regular = 'PKWO',
  TPR = 'TPR',
}
export type LegacyLoyaltyBenefitType = 'Coin' | 'CM';
export type LegacyLoyaltyStatus = 'Active' | 'Inactive' | 'Trashed';

export type LoyaltyBenefitType = 'COIN' | 'CREDIT_MEMO';

export enum PromoPriorityTypes {
  MAX_PRIORITY = -999,
  MIN_PRIORITY = 999,
}
