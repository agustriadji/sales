import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { EventBus } from '@nestjs/cqrs';
import { IdentityStub } from '@stubs/identity.stub';
import { DomainException } from '@wings-corporation/core';
import { DomainEvent, EntityId, WatchedProps } from '@wings-corporation/domain';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { GeneralVoucher, ICheckoutAggregate } from '@wings-online/cart/domains';
import {
  BuyerOverdue,
  DeliveryAddress,
  IBuyerWriteRepository,
  ICartReadRepository,
  ICartService,
  ICheckoutWriteRepository,
  IConfigReadRepository,
  OverdueBlockEnum,
} from '@wings-online/cart/interfaces';
import {
  IPromoCmsRedemptionWriteRepository,
  IPromoReadRepository,
} from '@wings-online/cart/promotion';
import { IVoucherWriteRepository } from '@wings-online/cart/voucher';
import { UserIdentity } from '@wings-online/common';

import { CheckoutCartHandler } from './';
import {
  CheckoutCartCommand,
  CheckoutCartCommandProps,
} from './checkout-cart.command';

export const OverdueStub = {
  generate(safe = true): BuyerOverdue {
    return {
      bmasBlock: safe ? '' : faker.helpers.enumValue(OverdueBlockEnum),
      dryBlock: safe ? '' : faker.helpers.enumValue(OverdueBlockEnum),
      frozenBlock: safe ? '' : faker.helpers.enumValue(OverdueBlockEnum),
      dryOverdue: safe ? false : faker.datatype.boolean(),
      frozenOverdue: safe ? false : faker.datatype.boolean(),
      bmasOverdue: safe ? false : faker.datatype.boolean(),
    };
  },
};

describe('CheckoutCartHandler', () => {
  let handler: CheckoutCartHandler;
  let logger: DeepMocked<PinoLogger>;
  let uow: DeepMocked<TypeOrmUnitOfWorkService>;
  let mutex: DeepMocked<MutexService>;
  let checkoutRepository: DeepMocked<ICheckoutWriteRepository>;
  let buyerRepository: DeepMocked<IBuyerWriteRepository>;
  let voucherRepository: DeepMocked<IVoucherWriteRepository>;
  let promoCmsRedemptionRepository: DeepMocked<IPromoCmsRedemptionWriteRepository>;
  let promoRepository: DeepMocked<IPromoReadRepository>;
  let cartRepository: DeepMocked<ICartReadRepository>;
  let eventBus: DeepMocked<EventBus>;
  let cartService: DeepMocked<ICartService>;
  let configRepository: DeepMocked<IConfigReadRepository>;

  beforeEach(() => {
    checkoutRepository = createMock();
    buyerRepository = createMock();
    promoRepository = createMock();
    voucherRepository = createMock();
    promoCmsRedemptionRepository = createMock();
    eventBus = createMock();
    cartRepository = createMock();
    cartService = createMock();
    configRepository = createMock();

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
    handler = new CheckoutCartHandler(
      logger,
      uow,
      mutex,
      checkoutRepository,
      buyerRepository,
      voucherRepository,
      cartRepository,
      promoCmsRedemptionRepository,
      eventBus,
      cartService,
      promoRepository,
      configRepository,
    );
  });

  describe('execute()', () => {
    it(`should not checkout dry cart given cart is not found`, async () => {
      const identity = IdentityStub.generate();
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: {
            getCurrentProps: jest.fn(() => {
              return createMock<GeneralVoucher>({ id: EntityId.create() });
            }),
          },
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: EntityId.fromString(faker.string.uuid()),
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );

      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);

      const { result } = await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.checkout).toHaveBeenCalled();
      expect(result.dry).toBeUndefined();
      expect(result.frozen?.success).toBeTruthy();
    });

    it(`should not checkout frozen cart given cart is not found`, async () => {
      const identity = IdentityStub.generate();
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const dryCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: {
            getCurrentProps: jest.fn(() => {
              return createMock<GeneralVoucher>({ id: EntityId.create() });
            }),
          },
        },
        items: [],
        type: 'DRY',
        deliveryAddressId: EntityId.fromString(faker.string.uuid()),
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([dryCart]);

      const { result } = await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(dryCart.checkout).toHaveBeenCalled();
      expect(result.frozen).toBeUndefined();
      expect(result.dry?.success).toBeTruthy();
    });

    it(`should not checkout frozen cart given freezer is not qualified`, async () => {
      const identity = createMock<UserIdentity>();
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: {
            getCurrentProps: jest.fn(() => {
              return createMock<GeneralVoucher>({ id: EntityId.create() });
            }),
          },
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: undefined,
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);
      const freezerQualifiedSpy = jest
        .spyOn(cartRepository, 'isFreezerQualified')
        .mockResolvedValue(false);

      const { result } = await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(freezerQualifiedSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.checkout).not.toHaveBeenCalled();
      expect(result.frozen?.success).toBeFalsy();
      expect(result.frozen?.error).toBeDefined();
    });

    it(`should use dry default address from identity given dry cart does not have address`, async () => {
      const defaultAddressId = faker.string.uuid();
      const identity = createMock<UserIdentity>({
        division: {
          dry: {
            defaultDeliveryAddressId: defaultAddressId,
          },
        },
      });
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const dryCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: {
            getCurrentProps: jest.fn(() => {
              return createMock<GeneralVoucher>({ id: EntityId.create() });
            }),
          },
        },
        items: [],
        type: 'DRY',
        deliveryAddressId: undefined,
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([dryCart]);

      await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(dryCart.checkout).toHaveBeenCalled();
      expect(dryCart.setDeliveryAddress).toHaveBeenCalledWith(
        EntityId.fromString(defaultAddressId),
      );
    });

    it(`should use frozen default address from identity given dry cart does not have address`, async () => {
      const defaultAddressId = faker.string.uuid();
      const identity = createMock<UserIdentity>({
        division: {
          frozen: {
            defaultDeliveryAddressId: defaultAddressId,
          },
        },
      });
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: {
            getCurrentProps: jest.fn(() => {
              return createMock<GeneralVoucher>({ id: EntityId.create() });
            }),
          },
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: undefined,
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);

      await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.checkout).toHaveBeenCalled();
      expect(frozenCart.setDeliveryAddress).toHaveBeenCalledWith(
        EntityId.fromString(defaultAddressId),
      );
    });

    it(`should automatically use address given buyer have not set a default address and only have exactly one address`, async () => {
      const identity = createMock<UserIdentity>({
        division: {
          frozen: {
            defaultDeliveryAddressId: undefined,
          },
        },
      });
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: {
            getCurrentProps: jest.fn(() => {
              return createMock<GeneralVoucher>({ id: EntityId.create() });
            }),
          },
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: undefined,
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);

      const addressId = EntityId.create();
      const address = createMock<DeliveryAddress>({
        id: addressId,
        type: 'FROZEN',
      });

      const getDeliveryAddressSpy = jest
        .spyOn(buyerRepository, 'getBuyerAddresses')
        .mockResolvedValue([address]);

      await handler.execute(cmd);

      expect(getDeliveryAddressSpy).toHaveBeenCalledTimes(1);
      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.setDeliveryAddress).toHaveBeenCalledWith(addressId);
    });

    it(`should not checkout cart given buyer have not set a default address and have multiple addresses`, async () => {
      const identity = createMock<UserIdentity>({
        division: {
          frozen: {
            defaultDeliveryAddressId: undefined,
          },
        },
      });
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: createMock(),
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: undefined,
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);

      const addressId = EntityId.create();
      const address = createMock<DeliveryAddress>({
        id: addressId,
        type: 'FROZEN',
      });
      const getDeliveryAddressSpy = jest
        .spyOn(buyerRepository, 'getBuyerAddresses')
        .mockResolvedValue([address, address]);

      const { result } = await handler.execute(cmd);

      expect(getDeliveryAddressSpy).toHaveBeenCalledTimes(1);
      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.setDeliveryAddress).not.toHaveBeenCalled();
      expect(frozenCart.checkout).not.toHaveBeenCalled();
      expect(result.frozen?.success).toBeFalsy();
      expect(result.frozen?.error).toBeDefined();
    });

    it(`should add command metadata to events`, async () => {
      const identity = IdentityStub.generate();
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: createMock(),
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: undefined,
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);
      const event = createMock<DomainEvent<any>>();
      frozenCart.flushEvents.mockReturnValueOnce([event]);

      await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.checkout).toHaveBeenCalled();
      expect(event.withCommandMetadata).toHaveBeenCalledWith(cmd);
    });

    it(`should unapply voucher given voucher is no longer found`, async () => {
      const identity = IdentityStub.generate();
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const voucher = createMock<GeneralVoucher>({ id: EntityId.create() });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: createMock<WatchedProps<GeneralVoucher>>({
            getCurrentProps() {
              return voucher;
            },
          }),
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: EntityId.create(),
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);

      voucherRepository.getVouchers.mockResolvedValueOnce([]);

      await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.checkout).toHaveBeenCalled();
      expect(frozenCart.unapplyVoucher).toHaveBeenCalled();
    });

    it(`should not checkout given checkout aggregate throws a DomainException`, async () => {
      const identity = IdentityStub.generate();
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: createMock(),
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: EntityId.fromString(faker.string.uuid()),
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);
      const exception = new DomainException(
        faker.string.sample(),
        faker.string.sample(),
      );
      frozenCart.checkout.mockImplementation(() => {
        throw exception;
      });

      const { result } = await handler.execute(cmd);

      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.checkout).toHaveBeenCalled();
      expect(result.frozen?.success).toBeFalsy();
      expect(result.frozen?.error).toBeDefined();
    });

    it(`should throw given checkout aggregate throws exception other than DomainException`, async () => {
      const identity = IdentityStub.generate();
      const data = createMock<CheckoutCartCommandProps>({ identity });
      const cmd = createMock<CheckoutCartCommand>({ data });
      const frozenCart = createMock<ICheckoutAggregate>({
        props: {
          items: [],
          generalVoucher: createMock(),
        },
        items: [],
        type: 'FROZEN',
        deliveryAddressId: EntityId.fromString(faker.string.uuid()),
        promoCmsRedemptions: [],
      });
      cartService.getOverdue.mockImplementation(async () =>
        OverdueStub.generate(),
      );
      const getCartSpy = jest
        .spyOn(checkoutRepository, 'getCarts')
        .mockResolvedValue([frozenCart]);
      const exception = new Error('something went wrong');
      frozenCart.checkout.mockImplementation(() => {
        throw exception;
      });

      await expect(handler.execute(cmd)).rejects.toThrow();
      expect(getCartSpy).toHaveBeenCalledTimes(1);
      expect(frozenCart.checkout).toHaveBeenCalled();
    });
  });
});
