import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

import { ListFrequentlyPurchasedProductsController } from './list-frequently-purchased-products.controller';
import { ListFrequentlyPurchasedProductsQuery } from './list-frequently-purchased-products.query';
import { ListFrequentlyPurchasedProductsQueryDto } from './list-frequently-purchased-products.query.dto';

describe('ListFrequentlyPurchasedProductsController', () => {
  let ctrl: ListFrequentlyPurchasedProductsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListFrequentlyPurchasedProductsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListFrequentlyPurchasedProductsQueryDto = {
      page: faker.number.int(),
      page_size: faker.number.int(),
    };
    const query = new ListFrequentlyPurchasedProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
