import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DivisionEnum } from '@wings-corporation/core';
import {
  CART_READ_REPOSITORY,
  CART_SERVICE,
  CONFIG_READ_REPOSITORY,
  GeneralConfigGroupEnum,
  GeneralConfigKeyEnum,
  TAG_KEY_MATERIAL_GROUP_2,
} from '@wings-online/app.constants';
import {
  ICartReadRepository,
  ICartService,
  IConfigReadRepository,
} from '@wings-online/cart/interfaces';
import { VOUCHER_READ_REPOSITORY } from '@wings-online/cart/voucher';
import { IVoucherReadRepository } from '@wings-online/cart/voucher/interfaces/voucher.read-repository.interface';

import { ListVouchersQuery } from './list-vouchers.query';
import { ListVouchersResult } from './list-vouchers.result';

@QueryHandler(ListVouchersQuery)
export class ListVouchersHandler
  implements IQueryHandler<ListVouchersQuery, ListVouchersResult>
{
  constructor(
    @InjectPinoLogger(ListVouchersHandler.name)
    private readonly logger: PinoLogger,
    @Inject(VOUCHER_READ_REPOSITORY)
    private readonly repository: IVoucherReadRepository,
    @Inject(CART_READ_REPOSITORY)
    private readonly cartRepository: ICartReadRepository,
    @Inject(CONFIG_READ_REPOSITORY)
    private readonly configRepository: IConfigReadRepository,
    @Inject(CART_SERVICE)
    private readonly cartService: ICartService,
  ) {}

  async execute(query: ListVouchersQuery): Promise<ListVouchersResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const vouchers = await this.repository.listVouchers(query.identity);

    // if the customer has dry division, use cart from dry division, otherwise use cart for frozen division
    const cart = query.identity.division.dry
      ? await this.cartService.getCart({
          identity: query.identity,
          type: DivisionEnum.DRY,
        })
      : await this.cartService.getCart({
          identity: query.identity,
          type: DivisionEnum.FROZEN,
        });

    const purchaseSummary = cart?.regularPurchaseAmountSummary;

    const generalVouchers = vouchers.data
      .filter((voucher) => !voucher.itemId && !voucher.grp02)
      .map((voucher) => {
        voucher.updateTotalPurchase(cart?.regularTotal.value || 0);
        return voucher;
      });

    const cartItems = cart?.items || [];
    const itemVouchers = vouchers.data
      .filter((voucher) => voucher.itemId)
      .map((voucher) => {
        voucher.updateIsItemInCart(
          cartItems.some(
            (x) => x.item.id === voucher.itemId && x.qty.value > 0,
          ),
        );
        voucher.updateTotalPurchase(
          purchaseSummary?.items[voucher.itemId!]?.value || 0,
        );
        return voucher;
      });
    const grp2Vouchers = vouchers.data
      .filter((voucher) => voucher.grp02)
      .map((voucher) => {
        voucher.updateIsItemInCart(
          cartItems.some(
            (x) =>
              x.item.tags.some(
                (tag) => this.generateMg2Tag(voucher.grp02!) === tag,
              ) && x.qty.value > 0,
          ),
        );
        voucher.updateTotalPurchase(
          purchaseSummary?.tags[this.generateMg2Tag(voucher.grp02!)]?.value ||
            0,
        );
        return voucher;
      });

    const isGeneralVoucherCombinable = !!Number(
      (await this.configRepository.getGeneralConfig(
        GeneralConfigGroupEnum.GeneralVoucher,
        GeneralConfigKeyEnum.GeneralVoucherFlagCombine,
      )) || 1,
    );

    if (!isGeneralVoucherCombinable) {
      generalVouchers.forEach((voucher) => {
        voucher.addNonCombinableVoucher(
          itemVouchers
            .map((x) => x.externalId)
            .concat(grp2Vouchers.map((x) => x.externalId)),
        );
      });
      itemVouchers.concat(grp2Vouchers).forEach((voucher) => {
        voucher.addNonCombinableVoucher(
          generalVouchers.map((x) => x.externalId),
        );
      });
    }

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
    return new ListVouchersResult(vouchers);
  }

  private generateMg2Tag(mg2: string): string {
    return TAG_KEY_MATERIAL_GROUP_2.concat(':').concat(mg2);
  }
}
