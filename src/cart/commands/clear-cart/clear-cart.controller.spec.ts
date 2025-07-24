import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { ClearCartController } from './clear-cart.controller';

describe('ClearCartController', () => {
  let ctrl: ClearCartController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new ClearCartController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
    await expect(ctrl.handler(req, identity, { type })).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
