import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { IdentityStub } from '@stubs/identity.stub';
import { Collection, DivisionEnum } from '@wings-corporation/core';
import { ICartReadRepository } from '@wings-online/cart/interfaces';
import { IPromoReadRepository } from '@wings-online/cart/promotion';
import { CartItemReadModel } from '@wings-online/cart/read-models';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { ListCartItemsHandler } from './';
import { ListCartItemsQuery } from './list-cart-items.query';

describe('ListCartItemsHandler', () => {
  let handler: ListCartItemsHandler;
  let logger: DeepMocked<PinoLogger>;
  let repository: DeepMocked<ICartReadRepository>;
  let promoRepository: DeepMocked<IPromoReadRepository>;
  let parameterService: DeepMocked<ParameterService>;

  beforeEach(() => {
    logger = createMock<PinoLogger>();
    repository = createMock<ICartReadRepository>();
    promoRepository = createMock<IPromoReadRepository>();
    parameterService = createMock<ParameterService>();
    handler = new ListCartItemsHandler(
      logger,
      repository,
      promoRepository,
      parameterService,
    );
  });

  describe('execute()', () => {
    it(`should issue query correctly to repository`, async () => {
      const identity = IdentityStub.generate();
      const limit = faker.number.int();
      const cursor = faker.string.sample();
      const query = new ListCartItemsQuery({
        identity,
        limit,
        cursor,
        type: faker.helpers.enumValue(DivisionEnum),
      });
      const collection = createMock<Collection<CartItemReadModel>>({
        data: [],
      });
      repository.getCartItems.mockImplementationOnce(async () => collection);
      await handler.execute(query);
      expect(repository.getCartItems).toHaveBeenCalledWith({ ...query });
    });
  });
});
