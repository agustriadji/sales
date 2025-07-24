import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { CorrelatableRequest } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { CreateWishlistBodyDto } from './create-wishlist.body.dto';
import { CreateWishlistController } from './create-wishlist.controller';

describe('CreateWishlistController', () => {
  let ctrl: CreateWishlistController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new CreateWishlistController(bus);
  });

  it(`should execute the correct command`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const body: CreateWishlistBodyDto = {
      name: faker.string.alphanumeric({ length: { min: 1, max: 50 } }),
    };
    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
