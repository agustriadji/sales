import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { IdentityStub } from '@stubs/identity.stub';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CartType } from '@wings-online/cart/cart.constants';
import { CheckoutAggregate } from '@wings-online/cart/domains';
import { ICartVoucherWriteRepository } from '@wings-online/cart/interfaces';

import {
  UnapplyCartVoucherCommand,
  UnapplyCartVoucherCommandProps,
} from './unapply-cart-voucher.command';
import { UnapplyCartVoucherHandler } from './unapply-cart-voucher.handler';

const UnapplyCartVoucherCommandPropsStub = {
  generate(): UnapplyCartVoucherCommandProps {
    return {
      identity: IdentityStub.generate(),
      type: faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']),
      voucherIds: [faker.string.alphanumeric(8)],
    };
  },
};

describe('UnapplyCartVoucherHandler', () => {
  let handler: UnapplyCartVoucherHandler;
  let logger: DeepMocked<PinoLogger>;
  let uow: DeepMocked<TypeOrmUnitOfWorkService>;
  let mutex: DeepMocked<MutexService>;
  let cartVoucherRepository: DeepMocked<ICartVoucherWriteRepository>;

  beforeEach(() => {
    cartVoucherRepository = createMock<ICartVoucherWriteRepository>();
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
    handler = new UnapplyCartVoucherHandler(
      logger,
      uow,
      mutex,
      cartVoucherRepository,
    );
  });

  describe('execute()', () => {
    it(`should throw given cart does not exists`, async () => {
      const props = UnapplyCartVoucherCommandPropsStub.generate();
      const cmd = new UnapplyCartVoucherCommand(props);
      cartVoucherRepository.getCart.mockResolvedValueOnce(undefined);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should unapply voucher from the cart`, async () => {
      const props = UnapplyCartVoucherCommandPropsStub.generate();
      const cmd = new UnapplyCartVoucherCommand(props);
      const cart = createMock<CheckoutAggregate>();
      cartVoucherRepository.getCart.mockResolvedValueOnce(cart);

      await handler.execute(cmd);
      expect(cart.unapplyVoucher).toHaveBeenCalled();
      expect(cartVoucherRepository.save).toHaveBeenCalled();
    });
  });
});
