import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { CorrelatableRequest } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { AddWishlistItemsBodyDto } from './add-wishlist-items.body.dto';
import { AddWishlistItemsController } from './add-wishlist-items.controller';

describe('AddWishlistItemsController', () => {
  let ctrl: AddWishlistItemsController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new AddWishlistItemsController(bus);
  });

  it(`should execute the correct command`, async () => {
    const itemId = faker.string.uuid();
    const identity: UserIdentity = IdentityStub.generate();
    const body: AddWishlistItemsBodyDto = {
      wishlist_id: faker.string.uuid(),
      item_ids: [itemId],
    };
    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
