import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { DivisionEnum } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { ListCartItemsController } from './list-cart-items.controller';
import { ListCartItemsQuery } from './list-cart-items.query';
import { ListCartItemsQueryDto } from './list-cart-items.query.dto';

describe('ListCartItemsController', () => {
  let ctrl: ListCartItemsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListCartItemsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListCartItemsQueryDto = {
      limit: faker.number.int(),
      cursor: faker.string.sample(),
      type: faker.helpers.enumValue(DivisionEnum),
    };
    const query = new ListCartItemsQuery({
      identity,
      limit: qs.limit,
      cursor: qs.cursor,
      type: qs.type,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
