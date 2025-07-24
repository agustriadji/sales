import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

import { ListBestSellerProductsController } from './list-best-seller-products.controller';
import { ListBestSellerProductsQuery } from './list-best-seller-products.query';
import { ListBestSellerProductsQueryDto } from './list-best-seller-products.query.dto';

describe('ListBestSellerProductsController', () => {
  let ctrl: ListBestSellerProductsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListBestSellerProductsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListBestSellerProductsQueryDto = {
      limit: faker.number.int(),
      cursor: faker.string.sample(),
      category_id: faker.string.sample(),
    };
    const query = new ListBestSellerProductsQuery({
      identity,
      limit: qs.limit,
      cursor: qs.cursor,
      categoryId: qs.category_id,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
