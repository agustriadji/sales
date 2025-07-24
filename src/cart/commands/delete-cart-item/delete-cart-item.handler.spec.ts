import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CartType } from '@wings-online/cart/cart.constants';
import { SalesItemModel } from '@wings-online/cart/domains';
import {
  ICartWriteRepository,
  ISalesItemWriteRepository,
} from '@wings-online/cart/interfaces';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { CartAggregate } from '../../domains/cart.aggregate';
import { DeleteCartItemCommand } from './delete-cart-item.command';
import { DeleteCartItemHandler } from './delete-cart-item.handler';

describe('DeleteCartItemHandler', () => {
  let handler: DeleteCartItemHandler;
  let logger: DeepMocked<PinoLogger>;
  let uow: DeepMocked<TypeOrmUnitOfWorkService>;
  let mutex: DeepMocked<MutexService>;
  let repository: DeepMocked<ICartWriteRepository>;
  let salesItemRepository: DeepMocked<ISalesItemWriteRepository>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    repository = createMock<ICartWriteRepository>();
    salesItemRepository = createMock<ISalesItemWriteRepository>();
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
    eventBus = createMock<EventBus>();
    handler = new DeleteCartItemHandler(
      logger,
      uow,
      mutex,
      repository,
      salesItemRepository,
      eventBus,
    );
  });

  describe('execute()', () => {
    it(`should throw given item is not found`, async () => {
      const identity = IdentityStub.generate();
      const itemId = faker.string.uuid();
      const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
      const cmd = new DeleteCartItemCommand({ type, identity, itemId });
      salesItemRepository.getSalesItem.mockImplementationOnce(
        async () => undefined,
      );

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should not throw given buyer's cart does not exists`, async () => {
      const identity = IdentityStub.generate();
      const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
      const item = createMock<SalesItemModel>();
      const cmd = new DeleteCartItemCommand({
        type,
        identity,
        itemId: item.id.value,
      });
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);
      repository.getBuyerCart.mockImplementationOnce(async () => undefined);
      await expect(handler.execute(cmd)).resolves.not.toThrow();
    });

    it(`should remove item from cart aggregate and publish all aggregate events`, async () => {
      const identity = IdentityStub.generate();
      const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
      const item = createMock<SalesItemModel>({
        tags: [],
      });
      const cmd = new DeleteCartItemCommand({
        type,
        identity,
        itemId: item.id.value,
      });
      salesItemRepository.getSalesItem.mockImplementationOnce(async () => item);
      const cart = createMock<CartAggregate>({
        items: {
          currentItems: [],
          getItems: jest.fn().mockReturnValue([]),
        },
        tags: {
          getItems: jest.fn().mockReturnValue([]),
        },
      });
      repository.getBuyerCart.mockImplementationOnce(async () => cart);

      await expect(handler.execute(cmd)).resolves.not.toThrow();
      expect(cart.removeItem).toHaveBeenCalledWith(identity, item.id.value);
      expect(repository.save).toHaveBeenCalledWith(cart);
      expect(eventBus.publishAll).toHaveBeenCalled();
    });
  });
});
