import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { UpdateCartAddressBodyDto } from './update-cart-address.body.dto';
import { UpdateCartAddressController } from './update-cart-address.controller';

describe('UpdateCartAddressController', () => {
  let ctrl: UpdateCartAddressController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>({
      id: faker.string.uuid(),
    });
    ctrl = new UpdateCartAddressController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const body: UpdateCartAddressBodyDto = {
      delivery_address_id: faker.string.uuid(),
      type: faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']),
    };
    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
