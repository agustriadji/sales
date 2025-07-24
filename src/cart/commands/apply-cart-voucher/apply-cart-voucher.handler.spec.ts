import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { IdentityStub } from '@stubs/identity.stub';
import { EntityId } from '@wings-corporation/domain';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CartType } from '@wings-online/cart/cart.constants';
import { CheckoutAggregate, Voucher } from '@wings-online/cart/domains';
import { ICartVoucherWriteRepository } from '@wings-online/cart/interfaces';
import { IVoucherWriteRepository } from '@wings-online/cart/voucher/interfaces';

import {
  ApplyCartVoucherCommand,
  ApplyCartVoucherCommandProps,
} from './apply-cart-voucher.command';
import { ApplyCartVoucherHandler } from './apply-cart-voucher.handler';

const ApplyCartVoucherCommandPropsStub = {
  generate(withValidation = true): ApplyCartVoucherCommandProps {
    return {
      type: faker.helpers.arrayElement<CartType>(['DRY', 'FROZEN']),
      identity: IdentityStub.generate(),
      voucherIds: [faker.string.alphanumeric(8)],
      withVoucherValidation: withValidation ?? faker.datatype.boolean(),
    };
  },
};

describe('ApplyCartVoucherHandler', () => {
  let handler: ApplyCartVoucherHandler;
  let logger: DeepMocked<PinoLogger>;
  let uow: DeepMocked<TypeOrmUnitOfWorkService>;
  let mutex: DeepMocked<MutexService>;
  let voucherRepository: DeepMocked<IVoucherWriteRepository>;
  let cartVoucherRepository: DeepMocked<ICartVoucherWriteRepository>;

  beforeEach(() => {
    voucherRepository = createMock<IVoucherWriteRepository>();
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
    handler = new ApplyCartVoucherHandler(
      logger,
      uow,
      mutex,
      voucherRepository,
      cartVoucherRepository,
    );
  });

  describe('execute()', () => {
    it(`should throw given voucher does not exists`, async () => {
      const props = ApplyCartVoucherCommandPropsStub.generate();
      const cmd = new ApplyCartVoucherCommand(props);
      const cart = createMock<CheckoutAggregate>();
      voucherRepository.getVouchers.mockResolvedValueOnce([]);
      cartVoucherRepository.getCart.mockResolvedValue(cart);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should throw given cart does not exists`, async () => {
      const props = ApplyCartVoucherCommandPropsStub.generate();
      const cmd = new ApplyCartVoucherCommand(props);
      const voucher = createMock<Voucher>();
      voucherRepository.getVouchers.mockResolvedValueOnce([voucher]);
      cartVoucherRepository.getCart.mockResolvedValueOnce(undefined);

      await expect(handler.execute(cmd)).rejects.toThrow();
    });

    it(`should apply voucher to the cart`, async () => {
      const props = ApplyCartVoucherCommandPropsStub.generate();
      const cmd = new ApplyCartVoucherCommand(props);
      const voucher = createMock<Voucher>({
        id: EntityId.fromString(props.voucherIds[0]),
      });

      const cart = createMock<CheckoutAggregate>({
        props: {
          generalVoucher: {
            getCurrentProps: jest.fn().mockReturnValue(voucher),
          },
        },
      });

      voucherRepository.getVouchers.mockResolvedValue([voucher]);
      cartVoucherRepository.getCart.mockResolvedValueOnce(cart);

      await handler.execute(cmd);

      expect(cart.applyVoucher).toHaveBeenCalled();
      expect(cartVoucherRepository.save).toHaveBeenCalled();
    });
  });
});
