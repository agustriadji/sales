export * from './voucher.write-repository.interface';

export enum VoucherType {
  DISCOUNT = 'Discount',
  FREE_PRODUCT = 'Free Product',
}

export enum VoucherDiscountType {
  PERCENTAGE = 'Percentage',
  NOMINAL = 'Nominal',
}

export enum VoucherStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  TRASHED = 'Trashed',
}

export enum VoucherRedemptionStatus {
  USED = 'Used',
  NOT_USED = 'Not Used',
}

// export enum VoucherDirectPage {
//   PRODUCT_BY_CATEGORY = 'Product By Category',
//   PRODUCT_BY_BRAND = 'Product By Brand',
//   PRODUCT_DETAIL = 'Product Detail',
//   PRODUCT_BARU = 'Product Baru',
//   CART = 'Cart',
//   PRODUCT_PROMO = 'Product Promo',
//   BANNER_PROMO = 'Banner Promo',
// }

// export enum VoucherProductBy {
//   MID = 'MID',
//   MG2 = 'MG2',
// }
