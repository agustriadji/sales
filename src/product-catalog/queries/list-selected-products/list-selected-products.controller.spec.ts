import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

import { ListSelectedProductsController } from './list-selected-products.controller';
import { ListSelectedProductsQuery } from './list-selected-products.query';
import { ListSelectedProductsQueryDto } from './list-selected-products.query.dto';

describe('ListSelectedProductsController', () => {
  let ctrl: ListSelectedProductsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListSelectedProductsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListSelectedProductsQueryDto = {
      page: faker.number.int(),
      page_size: faker.number.int(),
    };
    const query = new ListSelectedProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
