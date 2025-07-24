import { CorrelatableCommand } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export class UpdateCartAddressCommandProps {
  readonly identity: UserIdentity;
  readonly deliveryAddressId: string;
  readonly type: CartType;
}

export class UpdateCartAddressCommand extends CorrelatableCommand<UpdateCartAddressCommandProps> {
  constructor(data: UpdateCartAddressCommandProps) {
    super(data);
  }
}
