import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { EntityId } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

import { ListWishlistItemsController } from './list-wishlist-items.controller';
import { ListWishlistItemsQuery } from './list-wishlist-items.query';
import { ListWishlistItemsQueryDto } from './list-wishlist-items.query.dto';

describe('ListWishlistItemsController', () => {
  let ctrl: ListWishlistItemsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListWishlistItemsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListWishlistItemsQueryDto = {
      id: faker.string.uuid(),
      page: faker.number.int(),
      page_size: faker.number.int(),
    };
    const query = new ListWishlistItemsQuery({
      id: EntityId.fromString(qs.id),
      identity,
      page: qs.page,
      pageSize: qs.page_size,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
