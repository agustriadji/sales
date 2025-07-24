import { DiscountType } from '@wings-online/app.constants';

export interface VoucherReadModel {
  external_id: string;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase: number;
  max_discount: number;
  valid_until: string;
}
