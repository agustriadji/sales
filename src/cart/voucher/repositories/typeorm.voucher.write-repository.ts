import { Brackets } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { EntityId, Money, Quantity } from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { TAG_KEY_MATERIAL_GROUP_2 } from '@wings-online/app.constants';
import {
  MinimumPurchaseByItemCriterion,
  MinimumPurchaseByTagCriterion,
  MonetaryBenefit,
  PromoPercentage,
  Tag,
} from '@wings-online/cart/domains';
import { ItemVoucher } from '@wings-online/cart/domains/item-voucher.entity';
import {
  GeneralVoucher,
  Voucher,
} from '@wings-online/cart/domains/voucher.entity';
import { TypeOrmItemEntity } from '@wings-online/cart/entities';
import { UserIdentity } from '@wings-online/common';

import { TypeOrmRewardVoucherEntity } from '../entities';
import { TypeOrmVoucherRedemptionEntity } from '../entities/typeorm.voucher-redemption.entity';
import { VoucherDiscountType, VoucherRedemptionStatus } from '../interfaces';
import {
  IVoucherWriteRepository,
  UpdateVoucherRedemptionProps,
} from '../interfaces/voucher.write-repository.interface';

@Injectable()
export class TypeormVoucherWriteRepository implements IVoucherWriteRepository {
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  async getVouchers(
    identity: UserIdentity,
    voucherIds: string[],
  ): Promise<Voucher[]> {
    if (!voucherIds.length) return [];

    const vouchers = await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmVoucherRedemptionEntity, 'redemption')
      .innerJoin('redemption.voucher', 'voucher')
      .innerJoin('voucher.customer', 'customer')
      .leftJoin('customer.material', 'material')
      .leftJoinAndMapOne(
        'material.item',
        TypeOrmItemEntity,
        'item',
        `item.entity = :entity AND (item.externalId)::varchar = material.materialId`,
        {
          entity: identity.organization,
        },
      )
      .where(
        'redemption.rewardVoucherId IN (:...voucherIds) AND redemption.status = :redemptionStatus AND redemption.custId = :custId AND redemption.expiredDate >= DATE(now())',
        {
          voucherIds,
          redemptionStatus: VoucherRedemptionStatus.NOT_USED,
          custId: identity.externalId,
        },
      )
      .andWhere(
        new Brackets((inner) => {
          inner.where('customer.custId = :custId');
          inner.orWhere(
            new Brackets((inner2) => {
              inner2.andWhere('customer.custGroup IN (:...custGroup)', {
                custGroup: [
                  identity.division.dry?.group,
                  identity.division.frozen?.group,
                ].filter(Boolean),
              });
              inner2.andWhere('customer.slsOffice IN (:...slsOffice)', {
                slsOffice: [
                  identity.division.dry?.salesOffice,
                  identity.division.frozen?.salesOffice,
                ].filter(Boolean),
              });
              inner2.andWhere(`customer.custId = ''`);
            }),
          );
        }),
      )
      .select('redemption.rewardVoucherId')
      .addSelect([
        'voucher.isGeneral',
        'voucher.minPurchaseAmount',
        'voucher.maxDiscount',
        'voucher.discountType',
        'voucher.amount',
      ])
      .addSelect('customer.rewardVoucherId')
      .addSelect('material.matGrp2')
      .addSelect('item.id')
      .getMany();

    return vouchers
      .map((voucher) =>
        this.mapVoucher(voucher.voucher, voucher.rewardVoucherId),
      )
      .filter(Boolean) as Voucher[];
  }

  private mapVoucher(
    voucher: TypeOrmRewardVoucherEntity,
    voucherId: string,
  ): Voucher | undefined {
    if (voucher.isGeneral) {
      return GeneralVoucher.create(
        {
          minPurchase: Money.create(voucher.minPurchaseAmount),
          maxDiscount: voucher.maxDiscount
            ? Money.create(voucher.maxDiscount)
            : undefined,
          discount: MonetaryBenefit.create(
            voucher.discountType === VoucherDiscountType.NOMINAL
              ? Money.create(voucher.amount)
              : PromoPercentage.create(voucher.amount),
          ),
        },
        voucherId,
      );
    } else {
      const { material } = voucher.customer;
      if (!material) return;
      if (!material.matGrp2 && !material.item) return;

      return ItemVoucher.create(
        {
          discount: MonetaryBenefit.create(
            voucher.discountType === VoucherDiscountType.NOMINAL
              ? Money.create(voucher.amount)
              : PromoPercentage.create(voucher.amount),
          ),
          criteria: material.matGrp2
            ? MinimumPurchaseByTagCriterion.create({
                tag: Tag.create({
                  key: TAG_KEY_MATERIAL_GROUP_2,
                  value: material.matGrp2,
                }),
                minQty: Quantity.create(1),
                minAmount: Money.create(voucher.minPurchaseAmount || 0),
              })
            : MinimumPurchaseByItemCriterion.create({
                itemId: EntityId.fromString(material.item!.id),
                minQty: Quantity.create(1),
                minAmount: Money.create(voucher.minPurchaseAmount || 0),
              }),
          maxDiscount: voucher.maxDiscount
            ? Money.create(voucher.maxDiscount)
            : undefined,
        },
        voucherId,
      );
    }
  }

  async updateVoucherRedemption(
    props: UpdateVoucherRedemptionProps,
  ): Promise<void> {
    if (!props.voucherIds.length) return;

    await this.uowService
      .getEntityManager()
      .createQueryBuilder()
      .update(TypeOrmVoucherRedemptionEntity)
      .set({
        status: VoucherRedemptionStatus.USED,
        docNo: props.docNumber,
        usedDate: props.orderDate,
        updatedDate: props.orderDate,
      })
      .where('rewardVoucherId in (:...voucherIds)', {
        voucherIds: props.voucherIds,
      })
      .andWhere('custId = :custId', { custId: props.identity.externalId })
      .execute();
  }
}
