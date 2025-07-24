import { CorrelatableCommand } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export class UnapplyCartVoucherCommandProps {
  readonly identity: UserIdentity;
  readonly type: CartType;
  readonly voucherIds: string[];
}

export class UnapplyCartVoucherCommand extends CorrelatableCommand<UnapplyCartVoucherCommandProps> {
  constructor(props: UnapplyCartVoucherCommandProps) {
    super(props);
  }
}
