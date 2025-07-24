import { kebabCase } from 'lodash';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import {
  Division,
  DivisionEnum,
  DomainException,
} from '@wings-corporation/core';
import { DomainEvent, EntityId } from '@wings-corporation/domain';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import {
  BUYER_WRITE_REPOSITORY,
  CART_READ_REPOSITORY,
  CART_SERVICE,
  CHECKOUT_WRITE_REPOSITORY,
  CONFIG_READ_REPOSITORY,
  PROMO_CMS_REDEMPTION_WRITE_REPOSITORY,
} from '@wings-online/app.constants';
import { ICheckoutAggregate, Voucher } from '@wings-online/cart/domains';
import { CheckoutException } from '@wings-online/cart/exceptions';
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
  LoyaltyPromo,
  PROMO_READ_REPOSITORY,
} from '@wings-online/cart/promotion';
import {
  IVoucherWriteRepository,
  VOUCHER_WRITE_REPOSITORY,
} from '@wings-online/cart/voucher';
import {
  CommandHandlerWithMutex,
  createBadRequestException,
  IdentityUtil,
  LockUtil,
  UserIdentity,
} from '@wings-online/common';

import { CheckoutCartCommand } from './checkout-cart.command';
import { CheckoutCartResult } from './checkout-cart.result';

@CommandHandler(CheckoutCartCommand)
export class CheckoutCartHandler extends CommandHandlerWithMutex<
  CheckoutCartCommand,
  CheckoutCartResult
> {
  private buyerOverdue: BuyerOverdue | undefined = undefined;
  private loyalty: LoyaltyPromo | undefined = undefined;
  private isSimulatePrice = false;
  private deliveryAddresses: DeliveryAddress[] = [];
  private vouchers: Voucher[] = [];

  constructor(
    @InjectPinoLogger(CheckoutCartHandler.name)
    logger: PinoLogger,
    uowService: TypeOrmUnitOfWorkService,
    mutexService: MutexService,
    @Inject(CHECKOUT_WRITE_REPOSITORY)
    private readonly checkoutRepository: ICheckoutWriteRepository,
    @Inject(BUYER_WRITE_REPOSITORY)
    private readonly buyerRepository: IBuyerWriteRepository,
    @Inject(VOUCHER_WRITE_REPOSITORY)
    private readonly voucherRepository: IVoucherWriteRepository,
    @Inject(CART_READ_REPOSITORY)
    private readonly cartRepository: ICartReadRepository,
    @Inject(PROMO_CMS_REDEMPTION_WRITE_REPOSITORY)
    private readonly promoCmsRedemptionRepository: IPromoCmsRedemptionWriteRepository,
    private readonly eventBus: EventBus,
    @Inject(CART_SERVICE)
    private readonly service: ICartService,
    @Inject(PROMO_READ_REPOSITORY)
    private readonly promoRepository: IPromoReadRepository,
    @Inject(CONFIG_READ_REPOSITORY)
    private readonly configRepository: IConfigReadRepository,
  ) {
    super(mutexService, uowService, { logger });
  }

  async afterCommit(
    command: CheckoutCartCommand,
    result: CheckoutCartResult,
  ): Promise<CheckoutCartResult> {
    const events = result.events.map((event) =>
      event.withCommandMetadata(command),
    );
    await this.eventBus.publishAll(events);
    this.flush();
    return result;
  }

  getLockKey(command: CheckoutCartCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  flush(): void {
    this.buyerOverdue = undefined;
    this.loyalty = undefined;
    this.isSimulatePrice = false;
    this.deliveryAddresses = [];
    this.vouchers = [];
  }

  private async getCartsToCheckout(identity: UserIdentity): Promise<{
    dry: ICheckoutAggregate | undefined;
    frozen: ICheckoutAggregate | undefined;
  }> {
    const carts = await this.checkoutRepository.getCarts<ICheckoutAggregate>(
      identity,
    );

    return {
      dry: carts.find((cart) => cart.type === 'DRY'),
      frozen: carts.find((cart) => cart.type === 'FROZEN'),
    };
  }

  async handler(command: CheckoutCartCommand): Promise<CheckoutCartResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );
    const { identity } = command.data;

    const [overdue, isSimulatePrice, loyalty, carts, deliveryAddresses] =
      await Promise.all([
        this.service.getOverdue(identity),
        this.configRepository.getCartSimulatePriceSetting(),
        this.promoRepository.getLoyaltyPromo(identity),
        this.getCartsToCheckout(identity),
        this.buyerRepository.getBuyerAddresses(identity),
      ]);

    this.buyerOverdue = overdue;
    this.isSimulatePrice = isSimulatePrice;
    this.loyalty = loyalty;
    this.deliveryAddresses = deliveryAddresses;

    const { dry, frozen } = carts;
    const { dry: dryResult, frozen: frozenResult } = await this.checkoutAll(
      command,
      dry,
      frozen,
    );

    // Log memory usage in megabytes and bytes
    const memoryUsage = process.memoryUsage();
    this.logger.info(
      {
        memoryUsage: {
          rss: {
            bytes: memoryUsage.rss,
            megabytes: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
          },
          heapTotal: {
            bytes: memoryUsage.heapTotal,
            megabytes: (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
          },
          heapUsed: {
            bytes: memoryUsage.heapUsed,
            megabytes: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
          },
          external: {
            bytes: memoryUsage.external,
            megabytes: (memoryUsage.external / (1024 * 1024)).toFixed(2),
          },
          arrayBuffers: {
            bytes: memoryUsage.arrayBuffers,
            megabytes: (memoryUsage.arrayBuffers / (1024 * 1024)).toFixed(2),
          },
        },
      },
      'After Memory Usage',
    );
    this.logger.trace(`END`);
    return new CheckoutCartResult({
      dry: dryResult,
      frozen: frozenResult,
    });
  }

  private async checkoutAll(
    command: CheckoutCartCommand,
    dry: ICheckoutAggregate | undefined,
    frozen: ICheckoutAggregate | undefined,
  ): Promise<{ dry?: CheckoutResult; frozen?: CheckoutResult }> {
    const voucherIds = new Array()
      .concat(dry ? this.getVoucherIdsFromCart(dry) : [])
      .concat(frozen ? this.getVoucherIdsFromCart(frozen) : []);

    this.vouchers = await this.voucherRepository.getVouchers(
      command.data.identity,
      voucherIds,
    );

    const [dryResult, frozenResult] = await Promise.all([
      dry ? this.checkout(command, dry) : undefined,
      frozen ? this.checkout(command, frozen) : undefined,
    ]);

    return {
      dry: dryResult,
      frozen: frozenResult,
    };
  }

  private async checkout(
    command: CheckoutCartCommand,
    cart: ICheckoutAggregate,
  ): Promise<CheckoutResult> {
    const {
      identity,
      dryDeliveryDate,
      frozenDeliveryDate,
      latitude,
      longitude,
      isSimulatePrice,
    } = command.data;

    try {
      cart.checkSimulatedPrice();
    } catch (err) {
      if (this.isSimulatePrice) {
        // simulate on = throw error
        throw err;
      } else {
        // simulate off = do nothing
      }
    }

    // overdue validation
    const voucherIds = this.getVoucherIdsFromCart(cart);
    const overdueResult = this.validateOverdue(cart.type);
    if (overdueResult) return overdueResult;

    let deliveryDate: Date;
    if (cart.type === 'DRY') {
      if (!dryDeliveryDate) {
        return {
          success: false,
          error: new CheckoutException.DeliveryDateNotSet(),
        };
      }
      deliveryDate = dryDeliveryDate;
    } else {
      if (!frozenDeliveryDate) {
        return {
          success: false,
          error: new CheckoutException.DeliveryDateNotSet(),
        };
      }

      const freezerQualified = await this.cartRepository.isFreezerQualified(
        identity,
      );
      if (!freezerQualified) {
        return {
          success: false,
          error: new CheckoutException.FreezerNotQualified(),
        };
      }

      deliveryDate = frozenDeliveryDate;
    }

    if (!cart.deliveryAddressId) {
      const defaultAddressId = IdentityUtil.getDefaultAddressId(
        identity,
        cart.type,
      );
      if (defaultAddressId) {
        cart.setDeliveryAddress(EntityId.fromString(defaultAddressId));
      } else {
        const deliveryAddresses = this.deliveryAddresses.filter((address) =>
          [cart.type, 'ANY'].includes(address.type),
        );
        const hasExactlyOneAddress = deliveryAddresses.length === 1;
        if (hasExactlyOneAddress) {
          cart.setDeliveryAddress(deliveryAddresses[0].id);
        } else {
          return {
            success: false,
            events: [],
            error: new CheckoutException.DeliveryAddressNotSet(),
          };
        }
      }
    }

    voucherIds.forEach((voucherId) => {
      if (
        !this.vouchers.find((voucher) =>
          voucher.id.equals(EntityId.fromString(voucherId)),
        )
      ) {
        cart.unapplyVoucher(voucherId);
      }
    });

    // apply loyalty
    if (this.loyalty) cart.setLoyalty(this.loyalty);

    try {
      cart.checkout({
        deliveryDate,
        buyerLocation: {
          latitude,
          longitude,
        },
        isSimulatePrice,
      });
    } catch (err) {
      if (err instanceof DomainException) {
        // throw full error
        if (
          isSimulatePrice &&
          (err instanceof CheckoutException.MinimumOrderNotMet ||
            err instanceof CheckoutException.VoucherMinimumPurchaseNotMet ||
            err instanceof CheckoutException.VoucherItemNotInCart ||
            err instanceof CheckoutException.VoucherExceedMaxDiscount)
        ) {
          throw createBadRequestException(kebabCase(err.message));
        }
        return {
          success: false,
          error: err,
        };
      } else {
        throw err;
      }
    }

    await Promise.all([
      this.checkoutRepository.delete(cart),
      this.promoCmsRedemptionRepository.insert(
        cart.promoCmsRedemptions.map((x) => ({
          orderNumber: cart.props.orderNumber,
          buyerId: identity.id,
          qty: x.qty.value,
          promoCriteriaId: x.criteriaId,
        })),
      ),
      this.voucherRepository.updateVoucherRedemption({
        identity,
        docNumber: cart.props.orderNumber,
        orderDate: cart.props.orderDate,
        voucherIds: voucherIds,
      }),
    ]);

    return {
      success: true,
      events: cart.flushEvents(),
      orderNumber: cart.orderNumber,
      coin: cart.coin.value,
      items: cart.items.map((item) => {
        return {
          name: item.itemName,
          externalId: item.externalId.value,
          baseQty: item.qty.value,
          packQty: item.packQty.value,
        };
      }),
    };
  }

  private validateOverdue(cartType: Division): CheckoutResult | undefined {
    const overdue = this.buyerOverdue;
    if (!overdue) return undefined;

    if (overdue.bmasOverdue) {
      return {
        success: false,
        error: new CheckoutException.BuyerHaveOverdueLoan(),
      };
    }

    if (
      cartType === DivisionEnum.DRY &&
      overdue.dryBlock === OverdueBlockEnum.HARD
    ) {
      return {
        success: false,
        error: new CheckoutException.BuyerHaveDryOverdueLoan(),
      };
    } else if (
      cartType === DivisionEnum.FROZEN &&
      overdue.frozenBlock === OverdueBlockEnum.HARD
    ) {
      return {
        success: false,
        error: new CheckoutException.BuyerHaveFrozenOverdueLoan(),
      };
    }
  }

  private getVoucherIdsFromCart(cart: ICheckoutAggregate): string[] {
    const generalVoucher = cart.props.generalVoucher.getCurrentProps();
    const itemVouchers = cart.props.itemVouchers?.getItems() || [];

    return [...itemVouchers, generalVoucher]
      .map((voucher) => voucher?.id.value)
      .filter(Boolean) as string[];
  }
}

type CheckoutResult = {
  success: boolean;
  events?: DomainEvent<any>[];
  error?: DomainException;
  orderNumber?: string;
  items?: CheckoutItemResult[];
  coin?: number;
};

type CheckoutItemResult = {
  externalId: string;
  name: string;
  baseQty: number;
  packQty: number;
};
