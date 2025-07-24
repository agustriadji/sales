import { CorrelatableCommand } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export class ApplyCartVoucherCommandProps {
  readonly identity: UserIdentity;
  readonly type: CartType;
  readonly voucherIds: string[];
  readonly withVoucherValidation: boolean;
}

export class ApplyCartVoucherCommand extends CorrelatableCommand<ApplyCartVoucherCommandProps> {
  constructor(props: ApplyCartVoucherCommandProps) {
    super(props);
  }
}
