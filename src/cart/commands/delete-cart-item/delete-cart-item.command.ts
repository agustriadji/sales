import { CorrelatableCommand } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export class DeleteCartItemCommandProps {
  readonly identity: UserIdentity;
  readonly itemId: string;
  readonly type: CartType;
}

export class DeleteCartItemCommand extends CorrelatableCommand<DeleteCartItemCommandProps> {
  constructor(data: DeleteCartItemCommandProps) {
    super(data);
  }
}
