import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

import { ListNewProductsController } from './list-new-products.controller';
import { ListNewProductsQuery } from './list-new-products.query';
import { ListNewProductsQueryDto } from './list-new-products.query.dto';

describe('ListNewProductsController', () => {
  let ctrl: ListNewProductsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListNewProductsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListNewProductsQueryDto = {
      page: faker.number.int(),
      page_size: faker.number.int(),
    };
    const query = new ListNewProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
