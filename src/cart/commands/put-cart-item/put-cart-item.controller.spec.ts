import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelatableRequest } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { PutCartItemBodyDto } from './put-cart-item.body.dto';
import { PutCartItemController } from './put-cart-item.controller';

describe('PutCartItemController', () => {
  let ctrl: PutCartItemController;
  let bus: DeepMocked<CommandBus>;
  let req: DeepMocked<CorrelatableRequest>;

  beforeEach(() => {
    bus = createMock<CommandBus>();
    req = createMock<CorrelatableRequest>();
    ctrl = new PutCartItemController(bus);
  });

  it(`should execute the correct command`, async () => {
    const baseQty = faker.number.int();
    const packQty = faker.number.int();
    const itemId = faker.string.uuid();
    const identity: UserIdentity = IdentityStub.generate();
    const body: PutCartItemBodyDto = {
      item_id: itemId,
      base_qty: baseQty,
      pack_qty: packQty,
    };
    await expect(ctrl.handler(req, identity, body)).resolves.not.toThrow();
    expect(bus.execute).toHaveBeenCalled();
  });
});
