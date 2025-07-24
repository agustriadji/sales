import { orderBy } from 'lodash';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { DomainException } from '@wings-corporation/core';
import { EntityId } from '@wings-corporation/domain';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CART_VOUCHER_WRITE_REPOSITORY } from '@wings-online/app.constants';
import { ICartVoucherAggregate } from '@wings-online/cart/domains';
import { ICartVoucherWriteRepository } from '@wings-online/cart/interfaces';
import {
  IVoucherWriteRepository,
  VOUCHER_WRITE_REPOSITORY,
} from '@wings-online/cart/voucher';
import {
  CommandHandlerWithMutex,
  createBadRequestException,
  LockUtil,
  resolveErrorCode,
  UserIdentity,
} from '@wings-online/common';

import { ApplyCartVoucherCommand } from './apply-cart-voucher.command';

@CommandHandler(ApplyCartVoucherCommand)
export class ApplyCartVoucherHandler extends CommandHandlerWithMutex<
  ApplyCartVoucherCommand,
  void
> {
  constructor(
    @InjectPinoLogger(ApplyCartVoucherHandler.name)
    logger: PinoLogger,
    uowService: TypeOrmUnitOfWorkService,
    mutexService: MutexService,
    @Inject(VOUCHER_WRITE_REPOSITORY)
    private readonly voucherRepository: IVoucherWriteRepository,
    @Inject(CART_VOUCHER_WRITE_REPOSITORY)
    private readonly cartVoucherRepository: ICartVoucherWriteRepository,
  ) {
    super(mutexService, uowService, { logger });
  }

  getLockKey(command: ApplyCartVoucherCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  /**
   *
   * @param command
   * @returns
   */
  async handler(command: ApplyCartVoucherCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, voucherIds, type, withVoucherValidation } = command.data;

    const cart =
      await this.cartVoucherRepository.getCart<ICartVoucherAggregate>(
        type,
        identity,
      );
    if (!cart) throw createBadRequestException('cart-not-found');

    if (withVoucherValidation) {
      await this.unapplyExpiredCartVouchers(identity, cart);
    }

    const vouchers = orderBy(
      await this.voucherRepository.getVouchers(identity, voucherIds),
      ['isGeneral'],
      ['asc'],
    );

    const errors: (DomainException | BadRequestException)[] = [];
    const notFoundVoucherIds = voucherIds.filter(
      (voucherId) =>
        !vouchers.some((voucher) => voucher.id.value === voucherId),
    );
    if (notFoundVoucherIds.length) {
      errors.push(
        createBadRequestException('voucher-not-found', {
          voucher_ids: notFoundVoucherIds,
        }),
      );
    }

    for (const voucher of vouchers) {
      try {
        cart.applyVoucher(voucher, withVoucherValidation);
      } catch (err) {
        if (err instanceof DomainException) {
          errors.push(err);
        } else {
          throw err;
        }
      }
    }

    if (withVoucherValidation) {
      try {
        cart.validateVouchersMaxDiscount();
      } catch (err) {
        if (err instanceof DomainException) {
          errors.push(err);
        } else {
          throw err;
        }
      }

      if (errors.length) {
        throw createBadRequestException(
          'vouchers-not-applicable',
          errors.map((error) =>
            error instanceof DomainException
              ? {
                  code: resolveErrorCode(error),
                  details: error.details,
                }
              : error.getResponse()['error'],
          ),
        );
      }
    }

    await this.cartVoucherRepository.save(cart);

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
  }

  async unapplyExpiredCartVouchers(
    identity: UserIdentity,
    cart: ICartVoucherAggregate,
  ): Promise<void> {
    const generalVoucher = cart.props.generalVoucher.getCurrentProps();
    const itemVouchers = cart.props.itemVouchers?.getItems() || [];

    const voucherIds = [...itemVouchers, generalVoucher]
      .map((voucher) => voucher?.id.value)
      .filter(Boolean) as string[];

    const vouchers = await this.voucherRepository.getVouchers(
      identity,
      voucherIds,
    );

    voucherIds.forEach((voucherId) => {
      if (
        !vouchers.find((voucher) =>
          voucher.id.equals(EntityId.fromString(voucherId)),
        )
      ) {
        cart.unapplyVoucher(voucherId);
      }
    });
  }
}
