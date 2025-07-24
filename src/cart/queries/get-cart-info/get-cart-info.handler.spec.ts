import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { DivisionEnum } from '@wings-corporation/core';
import { ICartService } from '@wings-online/cart/interfaces';
import { CartReadModel } from '@wings-online/cart/read-models';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { GetCartInfoHandler } from './get-cart-info.handler';
import { GetCartInfoQuery } from './get-cart-info.query';
import { GetCartInfoResult } from './get-cart-info.result';

describe('GetCartInfoHandler', () => {
  let handler: GetCartInfoHandler;
  let logger: DeepMocked<PinoLogger>;
  let service: DeepMocked<ICartService>;

  beforeEach(() => {
    logger = createMock<PinoLogger>();
    service = createMock<ICartService>();
    handler = new GetCartInfoHandler(logger, service);
  });

  describe('execute()', () => {
    it(`should throw an error given that cart does not exists`, async () => {
      const identity = IdentityStub.generate();
      const query = new GetCartInfoQuery({ identity, type: 'DRY' });
      service.getCart.mockImplementationOnce(async () => undefined);
      await expect(handler.execute(query)).rejects.toThrow();
    });

    it(`should return cart info result given that cart does exists`, async () => {
      const identity = IdentityStub.generate();
      const query = new GetCartInfoQuery({
        identity,
        type: faker.helpers.enumValue(DivisionEnum),
      });
      const cart = createMock<CartReadModel>({
        items: [],
        tags: [],
      });
      service.getCart.mockImplementationOnce(async () => cart);
      await expect(handler.execute(query)).resolves.toBeInstanceOf(
        GetCartInfoResult,
      );
    });
  });
});
