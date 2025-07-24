import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { DivisionEnum } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { GetCartInfoController } from './get-cart-info.controller';
import { GetCartInfoQuery } from './get-cart-info.query';

describe('GetCartInfoController', () => {
  let ctrl: GetCartInfoController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new GetCartInfoController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const type: CartType = faker.helpers.enumValue(DivisionEnum);
    const query = new GetCartInfoQuery({ identity, type });
    await expect(ctrl.handler({ type }, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
