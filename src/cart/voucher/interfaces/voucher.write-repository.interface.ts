import { Voucher } from '@wings-online/cart/domains/voucher.entity';
import { UserIdentity } from '@wings-online/common';

export type UpdateVoucherRedemptionProps = {
  identity: UserIdentity;
  voucherIds: string[];
  docNumber: string;
  orderDate: Date;
};

export interface IVoucherWriteRepository {
  getVouchers(identity: UserIdentity, voucherIds: string[]): Promise<Voucher[]>;
  updateVoucherRedemption(props: UpdateVoucherRedemptionProps): Promise<void>;
}
