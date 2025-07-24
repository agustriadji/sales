import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { CorrelatableRequest } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { RemoveWishlistItemBodyDto } from './remove-wishlist-item.body.dto';
import { RemoveWishlistItemController } from './remove-wishlist-item.controller';

describe('RemoveWishlistItemController', () => {
  let ctrl: RemoveWishlistItemController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new RemoveWishlistItemController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const body: RemoveWishlistItemBodyDto = {
      wishlist_id: faker.string.uuid(),
      item_id: faker.string.uuid(),
    };
    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
