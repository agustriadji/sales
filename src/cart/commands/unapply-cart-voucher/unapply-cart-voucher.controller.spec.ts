import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { UnapplyCartVoucherBodyDto } from './unapply-cart-voucher.body.dto';
import { UnapplyCartVoucherController } from './unapply-cart-voucher.controller';

describe('UnapplyCartVoucherController', () => {
  let ctrl: UnapplyCartVoucherController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new UnapplyCartVoucherController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
    const body: UnapplyCartVoucherBodyDto = {
      voucher_ids: [faker.string.alphanumeric()],
      type,
    };
    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
