import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { CheckoutCartBodyDto } from './checkout-cart.body.dto';
import { CheckoutCartController } from './checkout-cart.controller';

describe('CheckoutCartController', () => {
  let ctrl: CheckoutCartController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new CheckoutCartController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const body: CheckoutCartBodyDto = {
      dry_delivery_date: faker.date.future(),
      frozen_delivery_date: faker.date.future(),
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      is_simulate_price: faker.datatype.boolean(),
    };
    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
