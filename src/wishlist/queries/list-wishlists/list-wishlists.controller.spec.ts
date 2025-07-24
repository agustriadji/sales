import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

import { ListWishlistsController } from './list-wishlists.controller';
import { ListWishlistsQuery } from './list-wishlists.query';
import { ListWishlistsQueryDto } from './list-wishlists.query.dto';

describe('ListWishlistsController', () => {
  let ctrl: ListWishlistsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListWishlistsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListWishlistsQueryDto = {
      limit: faker.number.int(),
      cursor: faker.string.sample(),
    };
    const query = new ListWishlistsQuery({
      identity,
      limit: qs.limit,
      cursor: qs.cursor,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
