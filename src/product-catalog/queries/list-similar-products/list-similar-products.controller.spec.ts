import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

import { ListSimilarProductsController } from './list-similar-products.controller';
import { ListSimilarProductsQuery } from './list-similar-products.query';
import { ListSimilarProductsQueryDto } from './list-similar-products.query.dto';

describe('ListSimilarProductsController', () => {
  let ctrl: ListSimilarProductsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListSimilarProductsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListSimilarProductsQueryDto = {
      page: faker.number.int(),
      page_size: faker.number.int(),
    };
    const query = new ListSimilarProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
