import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CartType } from '@wings-online/cart/cart.constants';
import { ICartWriteRepository } from '@wings-online/cart/interfaces';

import { IdentityStub } from '../../../../test/stubs/identity.stub';
import { CartAggregate } from '../../domains/cart.aggregate';
import { ClearCartCommand } from './clear-cart.command';
import { ClearCartHandler } from './clear-cart.handler';

describe('ClearCartHandler', () => {
  let handler: ClearCartHandler;
  let repository: DeepMocked<ICartWriteRepository>;
  let uow: DeepMocked<TypeOrmUnitOfWorkService>;
  let mutex: DeepMocked<MutexService>;
  let eventBus: DeepMocked<EventBus>;

  beforeEach(() => {
    repository = createMock<ICartWriteRepository>();
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
    eventBus = createMock<EventBus>();
    handler = new ClearCartHandler(uow, mutex, repository, eventBus);
  });

  describe('execute()', () => {
    it(`should not throw given buyer's cart does not exists`, async () => {
      const identity = IdentityStub.generate();
      const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
      const cmd = new ClearCartCommand({ type, identity });
      repository.getBuyerCart.mockImplementationOnce(async () => undefined);
      await expect(handler.execute(cmd)).resolves.not.toThrow();
    });

    it(`should clear cart given buyer's cart exists and publish all aggregate events`, async () => {
      const identity = IdentityStub.generate();
      const type = faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']);
      const cmd = new ClearCartCommand({ type, identity });
      const cart = createMock<CartAggregate>();
      repository.getBuyerCart.mockImplementationOnce(async () => cart);

      await expect(handler.execute(cmd)).resolves.not.toThrow();
      expect(cart.clear).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(eventBus.publishAll).toHaveBeenCalled();
    });
  });
});
