import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { DeleteCartItemController } from './delete-cart-item.controller';

describe('DeleteCartItemController', () => {
  let ctrl: DeleteCartItemController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new DeleteCartItemController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const itemId = faker.string.uuid();
    const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
    await expect(
      ctrl.handler(req, identity, { type, item_id: itemId }),
    ).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
