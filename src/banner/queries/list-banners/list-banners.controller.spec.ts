import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { QueryBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { UserIdentity } from '@wings-online/common';

import { ListBannersController } from './list-banners.controller';
import { ListBannersQuery } from './list-banners.query';
import { ListBannersQueryDto } from './list-banners.query.dto';

describe('ListBannersController', () => {
  let ctrl: ListBannersController;
  let bus: DeepMocked<QueryBus>;

  beforeEach(() => {
    bus = createMock<QueryBus>();
    ctrl = new ListBannersController(bus);
  });

  it(`should execute the correct query`, async () => {
    const identity: UserIdentity = IdentityStub.generate();
    const qs: ListBannersQueryDto = {
      page: faker.number.int(),
      page_size: faker.number.int(),
    };
    const query = new ListBannersQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
    });
    await expect(ctrl.handler(qs, identity)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalledWith(query);
  });
});
