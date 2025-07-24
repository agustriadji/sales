import {
  ListBrandVariantsController,
  ListBrandVariantsQuery,
  ListBrandVariantsQueryDto,
} from '.';

import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

describe('ListBrandVariantProductsController', () => {
  let ctrl: ListBrandVariantsController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListBrandVariantsController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListBrandVariantsQueryDto = {
      id: faker.number.int(),
      active_item_id: faker.string.sample(),
    };
    const query = new ListBrandVariantsQuery({
      ...qs,
      activeItemId: qs.active_item_id,
      identity,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
