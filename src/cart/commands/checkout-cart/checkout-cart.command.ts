import { CorrelatableCommand, WithIdentity } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class CheckoutCartCommandProps implements WithIdentity<UserIdentity> {
  readonly identity: UserIdentity;
  readonly dryDeliveryDate?: Date;
  readonly frozenDeliveryDate?: Date;
  readonly latitude: number;
  readonly longitude: number;
  readonly isSimulatePrice: boolean;
}

export class CheckoutCartCommand extends CorrelatableCommand<CheckoutCartCommandProps> {
  constructor(data: CheckoutCartCommandProps) {
    super(data);
  }
}
