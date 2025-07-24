import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';
import { FlashSaleStatusEnum } from '@wings-online/product-catalog/promotion';

import { ListFlashSaleProductsController } from './list-flash-sale-products.controller';
import { ListFlashSaleProductsQuery } from './list-flash-sale-products.query';
import { ListFlashSaleProductsQueryDto } from './list-flash-sale-products.query.dto';

describe('ListFlashSaleProductsController', () => {
  let ctrl: ListFlashSaleProductsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListFlashSaleProductsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListFlashSaleProductsQueryDto = {
      page: faker.number.int(),
      page_size: faker.number.int(),
      status: faker.helpers.enumValue(FlashSaleStatusEnum),
    };
    const query = new ListFlashSaleProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
      status: qs.status,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
