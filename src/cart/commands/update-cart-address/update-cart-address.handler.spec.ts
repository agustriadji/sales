import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { IdentityStub } from '@stubs/identity.stub';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CartType } from '@wings-online/cart/cart.constants';
import {
  IBuyerWriteRepository,
  ICartWriteRepository,
} from '@wings-online/cart/interfaces';

import { CartAggregate } from '../../domains/cart.aggregate';
import {
  UpdateCartAddressCommand,
  UpdateCartAddressCommandProps,
} from './update-cart-address.command';
import { UpdateCartAddressHandler } from './update-cart-address.handler';

const UpdateCartAddressCommandPropsStub = {
  generate(): UpdateCartAddressCommandProps {
    return {
      type: faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']),
      identity: IdentityStub.generate(),
      deliveryAddressId: faker.string.uuid(),
    };
  },
};

describe('UpdateCartAddressHandler', () => {
  let handler: UpdateCartAddressHandler;
  let logger: DeepMocked<PinoLogger>;
  let uow: DeepMocked<TypeOrmUnitOfWorkService>;
  let mutex: DeepMocked<MutexService>;
  let cartRepository: DeepMocked<ICartWriteRepository>;
  let buyerRepository: DeepMocked<IBuyerWriteRepository>;

  beforeEach(() => {
    cartRepository = createMock<ICartWriteRepository>();
    buyerRepository = createMock<IBuyerWriteRepository>();
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
    handler = new UpdateCartAddressHandler(
      logger,
      uow,
      mutex,
      buyerRepository,
      cartRepository,
    );
  });

  describe('execute()', () => {
    it(`should not throw when given buyer's cart does not exists`, async () => {
      const props = UpdateCartAddressCommandPropsStub.generate();
      const cmd = new UpdateCartAddressCommand(props);
      cartRepository.getBuyerCart.mockResolvedValueOnce(undefined);
      await expect(handler.execute(cmd)).resolves.not.toThrow();
    });

    it(`should throw when given buyer's address does not exists`, async () => {
      const props = UpdateCartAddressCommandPropsStub.generate();
      const cmd = new UpdateCartAddressCommand(props);
      const cart = createMock<CartAggregate>();
      cartRepository.getBuyerCart.mockResolvedValueOnce(cart);
      buyerRepository.isBuyerAddressExists.mockResolvedValue(false);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should update address when cart given buyer's cart exists`, async () => {
      const props = UpdateCartAddressCommandPropsStub.generate();
      const cmd = new UpdateCartAddressCommand(props);
      const cart = createMock<CartAggregate>();
      cartRepository.getBuyerCart.mockResolvedValueOnce(cart);
      buyerRepository.isBuyerAddressExists.mockResolvedValue(true);

      await expect(handler.execute(cmd)).resolves.not.toThrow();
      expect(cart.updateAddress).toHaveBeenCalled();
      expect(cartRepository.save).toHaveBeenCalled();
    });
  });
});
