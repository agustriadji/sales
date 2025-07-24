import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { CartItemStub } from '@stubs/cart.stub';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import {
  CartAggregate,
  CartFactory,
  SalesItemModel,
} from '@wings-online/cart/domains';
import {
  ICartWriteRepository,
  ISalesItemWriteRepository,
} from '@wings-online/cart/interfaces';
import { UserIdentity } from '@wings-online/common';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import {
  PutCartItemCommand,
  PutCartItemCommandProps,
} from './put-cart-item.command';
import { PutCartItemHandler } from './put-cart-item.handler';

const PutCartItemCommandPropsStub = {
  generate(params?: {
    withNoDefaultAddress?: boolean;
    identity?: UserIdentity;
  }): PutCartItemCommandProps {
    return {
      identity:
        params?.identity ||
        IdentityStub.generate({
          withNoDefaultAddress: params?.withNoDefaultAddress,
        }),
      baseQty: faker.number.int({ max: 999 }),
      packQty: faker.number.int({ max: 999 }),
      itemId: faker.string.uuid(),
    };
  },
};

describe('PutCartItemHandler', () => {
  let handler: PutCartItemHandler;
  let logger: DeepMocked<PinoLogger>;
  let uow: DeepMocked<TypeOrmUnitOfWorkService>;
  let mutex: DeepMocked<MutexService>;
  let cartRepository: DeepMocked<ICartWriteRepository>;
  let salesItemRepository: DeepMocked<ISalesItemWriteRepository>;
  let factory: DeepMocked<CartFactory>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    salesItemRepository = createMock<ISalesItemWriteRepository>();
    cartRepository = createMock<ICartWriteRepository>();
    uow = createMock<TypeOrmUnitOfWorkService>({
      start(doWork) {
        return doWork();
      },
    });
    mutex = createMock<MutexService>({
      withLock(lockName, fn) {
        return fn();
      },
    });
    logger = createMock<PinoLogger>();
    factory = createMock<CartFactory>();
    eventBus = createMock<EventBus>();
    handler = new PutCartItemHandler(
      logger,
      uow,
      mutex,
      salesItemRepository,
      cartRepository,
      factory,
      eventBus,
    );
  });

  describe('execute()', () => {
    it(`should throw given item is not found`, async () => {
      const props = PutCartItemCommandPropsStub.generate();
      const cmd = new PutCartItemCommand(props);
      salesItemRepository.getSalesItem.mockImplementationOnce(
        async () => undefined,
      );

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should throw given item is not active`, async () => {
      const props = PutCartItemCommandPropsStub.generate();
      const cmd = new PutCartItemCommand(props);
      const item = createMock<SalesItemModel>({
        isActive: false,
      });
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should throw given packQty is provided but item does not have a pack`, async () => {
      const props = PutCartItemCommandPropsStub.generate();
      const cmd = new PutCartItemCommand(props);
      const item = createMock<SalesItemModel>({
        isActive: true,
        pack: undefined,
      });
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should throw given buyer does not have default address`, async () => {
      const props = PutCartItemCommandPropsStub.generate({
        withNoDefaultAddress: true,
      });
      const cmd = new PutCartItemCommand(props);
      const item = createMock<SalesItemModel>({
        isActive: true,
      });
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);
      cartRepository.getBuyerCart.mockImplementationOnce(async () => undefined);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should create a buyer's cart given it does not exist yet`, async () => {
      const props = PutCartItemCommandPropsStub.generate();
      const cmd = new PutCartItemCommand(props);
      const item = createMock<SalesItemModel>({
        isActive: true,
        tags: [],
      });
      const cart = createMock<CartAggregate>({
        items: {
          currentItems: [],
          getItems: jest.fn().mockReturnValue([CartItemStub.generate()]),
        },
        tags: {
          getItems: jest.fn().mockReturnValue([]),
        },
      });
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);
      cartRepository.getBuyerCart.mockImplementationOnce(async () => undefined);
      factory.create.mockImplementationOnce(() => cart);

      await expect(handler.execute(cmd)).resolves.not.toThrow();
      expect(factory.create).toHaveBeenCalledTimes(1);
    });

    it(`should add item to cart and save it when cart exists`, async () => {
      const props = PutCartItemCommandPropsStub.generate();
      const cmd = new PutCartItemCommand(props);
      const item = createMock<SalesItemModel>({
        isActive: true,
        tags: [],
      });
      const cart = createMock<CartAggregate>({
        items: {
          currentItems: [],
          getItems: jest.fn().mockReturnValue([]),
        },
        tags: {
          getItems: jest.fn().mockReturnValue([]),
        },
      });
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);
      cartRepository.getBuyerCart.mockImplementationOnce(async () => cart);
      cartRepository.save.mockResolvedValueOnce(undefined); // Mock save method

      await expect(handler.execute(cmd)).resolves.not.toThrow();
      expect(cart.putItem).toHaveBeenCalledWith(
        expect.anything(),
        item,
        expect.anything(),
        expect.anything(),
      );
      expect(cartRepository.save).toHaveBeenCalledWith(cart);
    });

    it(`should return the correct PutCartItemResult with events`, async () => {
      const props = PutCartItemCommandPropsStub.generate();
      const cmd = new PutCartItemCommand(props);
      const item = createMock<SalesItemModel>({
        isActive: true,
        tags: [],
      });
      const cart = createMock<CartAggregate>({
        items: {
          currentItems: [],
          getItems: jest.fn().mockReturnValue([]),
        },
        tags: {
          getItems: jest.fn().mockReturnValue([]),
        },
        countTagItemCombination: jest.fn().mockReturnValue({ value: 1 }),
      });
      const cartTags = [];
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);
      cartRepository.getBuyerCart.mockImplementationOnce(async () => cart);
      cartRepository.getCartTagsByTags.mockResolvedValueOnce(cartTags);
      cartRepository.save.mockResolvedValueOnce(undefined);
      eventBus.publishAll.mockResolvedValueOnce(undefined);

      const result = await handler.execute(cmd);

      expect(result.events).toBeDefined();
      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    });
  });
});
