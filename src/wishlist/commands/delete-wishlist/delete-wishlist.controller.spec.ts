import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { CorrelatableRequest } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { DeleteWishlistBodyDto } from './delete-wishlist.body.dto';
import { DeleteWishlistController } from './delete-wishlist.controller';

describe('DeleteWishlistController', () => {
  let ctrl: DeleteWishlistController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new DeleteWishlistController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const body: DeleteWishlistBodyDto = {
      id: faker.string.uuid(),
    };

    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
