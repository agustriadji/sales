import { CorrelatableCommand } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export type ClearCartCommandProps = {
  readonly identity: UserIdentity;
  readonly type: CartType;
};

export class ClearCartCommand extends CorrelatableCommand<ClearCartCommandProps> {
  constructor(data: ClearCartCommandProps) {
    super(data);
  }
}
