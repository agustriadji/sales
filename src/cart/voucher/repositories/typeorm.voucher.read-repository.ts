import { Brackets, DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Collection } from '@wings-corporation/core';
import { Quantity } from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import {
  LegacyCustomerRewardStatusEnum,
  LegacyVoucherTypeEnum,
  TAG_KEY_MATERIAL_GROUP_2,
} from '@wings-online/app.constants';
import { CartType } from '@wings-online/cart/cart.constants';
import { PackQty } from '@wings-online/cart/domains';
import {
  TypeOrmItemEntity,
  TypeOrmItemSalesConfigEntity,
} from '@wings-online/cart/entities';
import {
  ISalesUom,
  SalesTier,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';

import { TypeOrmRewardVoucherEntity } from '../entities';
import { VoucherDiscountType, VoucherStatus } from '../interfaces';
import { IVoucherReadRepository } from '../interfaces/voucher.read-repository.interface';
import { FreeProductReadModel, VoucherReadModel } from '../read-models';

@Injectable()
export class TypeormVoucherReadRepository implements IVoucherReadRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listVouchers(
    identity: UserIdentity,
  ): Promise<Collection<VoucherReadModel>> {
    const vouchers: VoucherReadModel[] = [];

    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmRewardVoucherEntity, 'voucher')
      .innerJoin('voucher.redemptions', 'redemptions')
      .andWhere('redemptions.custId = :externalId', {
        externalId: identity.externalId,
      })
      .andWhere('redemptions.status = :status', {
        status: LegacyCustomerRewardStatusEnum.NOT_USED,
      })
      .innerJoinAndSelect('voucher.customer', 'customer')
      .andWhere(
        new Brackets((qb) => {
          qb.orWhere('customer.custId = :externalId', {
            externalId: identity.externalId,
          });
          if (identity.division.dry) {
            qb.orWhere(
              new Brackets((qb) => {
                qb.andWhere('customer.slsOffice = :drySlsOffice', {
                  drySlsOffice: identity.division.dry!.salesOffice,
                });
                qb.andWhere('customer.custGroup = :dryCustGroup', {
                  dryCustGroup: identity.division.dry!.group,
                });
                qb.andWhere(`(customer.custId = '') IS NOT FALSE`);
              }),
            );
          }
          if (identity.division.frozen) {
            qb.orWhere(
              new Brackets((qb) => {
                qb.andWhere('customer.slsOffice = :frozenSlsOffice', {
                  frozenSlsOffice: identity.division.frozen!.salesOffice,
                });
                qb.andWhere('customer.custGroup = :frozenCustGroup', {
                  frozenCustGroup: identity.division.frozen!.group,
                });
                qb.andWhere(`(customer.custId = '') IS NOT FALSE`);
              }),
            );
          }
        }),
      )
      .leftJoinAndSelect('customer.material', 'material')
      .leftJoinAndMapOne(
        'material.item',
        TypeOrmItemEntity,
        'item',
        `item.entity = :entity AND (item.externalId)::varchar = material.materialId`,
        {
          entity: identity.organization,
        },
      )
      .leftJoin('item.info', 'info')
      .leftJoinAndMapMany(
        'item.salesConfigs',
        TypeOrmItemSalesConfigEntity,
        'config',
        'item.id = config.itemId AND config.key IN (:...salesConfigKeys)',
        {
          salesConfigKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .addSelect(['info.name'])
      .andWhere('voucher.type = :type', {
        type: LegacyVoucherTypeEnum.DISCOUNT,
      })
      .andWhere('redemptions.expiredDate >= DATE(now())')
      .getMany();

    await this.mergeTagSampleItems(identity, entities);

    for (const entity of entities) {
      const item = entity.customer.material?.item;

      if (!entity.isGeneral && !item) {
        continue;
      }

      const voucher: VoucherReadModel = new VoucherReadModel({
        externalId: entity.rewardVoucherId,
        itemName: entity.customer.material?.materialId
          ? item?.info?.name
          : undefined,
        itemId: entity.customer.material?.materialId ? item?.id : undefined,
        brandName: entity.customer.material?.matGrp2
          ? item?.info?.brand?.description
          : undefined,
        grp02: entity.customer.material?.matGrp2,
        minPurchase: entity.minPurchaseAmount,
        maxDiscount: entity.maxDiscount || null,
        discountType:
          entity.discountType === VoucherDiscountType.PERCENTAGE
            ? 'PERCENTAGE'
            : 'AMOUNT',
        discountValue: entity.amount,
        nonCombinableVouchers: this.getNonCombinableVouchers(entity, entities),
      });

      vouchers.push(voucher);
    }

    return {
      data: vouchers,
      metadata: {},
    };
  }

  private getNonCombinableVouchers(
    voucher: TypeOrmRewardVoucherEntity,
    vouchers: TypeOrmRewardVoucherEntity[],
  ): string[] {
    const otherVouchers = vouchers.filter(
      (v) => v.rewardVoucherId !== voucher.rewardVoucherId,
    );

    if (voucher.isGeneral) {
      return otherVouchers
        .filter((v) => v.isGeneral)
        .map((v) => v.rewardVoucherId);
    }

    if (voucher.customer.material?.materialId) {
      return otherVouchers
        .filter((v) => {
          if (v.customer.material?.materialId) {
            return (
              v.customer.material?.materialId ===
              voucher.customer.material?.materialId
            );
          }

          if (v.customer.material?.matGrp2) {
            const materialMg2 = voucher.customer.material?.item
              ? this.parseItemMg2(voucher.customer.material?.item)
              : undefined;
            return materialMg2
              ? v.customer.material?.matGrp2 === materialMg2
              : false;
          }

          return false;
        })
        .map((v) => v.rewardVoucherId);
    }

    if (voucher.customer.material?.matGrp2) {
      return otherVouchers
        .filter((v) => {
          if (v.customer.material?.materialId) {
            const materialMg2 = v.customer.material?.item
              ? this.parseItemMg2(v.customer.material?.item)
              : undefined;

            return materialMg2 === voucher.customer.material?.matGrp2;
          }

          if (v.customer.material?.matGrp2) {
            return (
              v.customer.material?.matGrp2 ===
              voucher.customer.material?.matGrp2
            );
          }

          return false;
        })
        .map((v) => v.rewardVoucherId);
    }

    return [];
  }

  async mergeTagSampleItems(
    identity: UserIdentity,
    entities: TypeOrmRewardVoucherEntity[],
  ) {
    const tags: string[] = [];
    entities.forEach((entity) => {
      if (entity.customer.material?.matGrp2) {
        tags.push(
          `${TAG_KEY_MATERIAL_GROUP_2}:${entity.customer.material.matGrp2}`,
        );
      }
    });

    if (!tags.length) {
      return;
    }

    const tagSampleItems = await this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfig',
        'salesConfig.key IN (:...salesConfigKeys)',
        {
          salesConfigKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .innerJoinAndSelect('item.info', 'info')
      .innerJoinAndSelect('info.brand', 'brand')
      .where('item.entity = :entity', { entity: identity.organization })
      .andWhere(':tags && salesConfig.tags', {
        tags: tags,
      })
      .distinctOn(['info.brandId'])
      .getMany();

    entities.forEach((entity) => {
      const matGrp2 = entity.customer.material?.matGrp2;
      if (matGrp2) {
        const matchedTagSampleItem = tagSampleItems.find((item) =>
          item.salesConfigs.some((config) =>
            config.tags.includes(
              TAG_KEY_MATERIAL_GROUP_2.concat(':').concat(matGrp2),
            ),
          ),
        );
        if (matchedTagSampleItem) {
          entity.customer.material.item = matchedTagSampleItem;
        }
      }
    });
  }

  async listFreeProductVouchers(
    identity: UserIdentity,
    type: CartType,
  ): Promise<FreeProductReadModel[]> {
    const query = this.dataSource
      .createQueryBuilder(TypeOrmRewardVoucherEntity, 'voucher')
      .select(['voucher.rewardVoucherId', 'voucher.qty', 'voucher.uom'])
      .innerJoin('voucher.redemptions', 'redemptions')
      .innerJoin('voucher.customer', 'customer')
      .addSelect('customer.rewardVoucherId')
      .innerJoin('customer.material', 'material')
      .addSelect('material.rewardVoucherMatId')
      .innerJoinAndMapOne(
        'material.item',
        TypeOrmItemEntity,
        'item',
        `item.entity = :entity AND (item.externalId)::varchar = material.materialId`,
        {
          entity: identity.organization,
        },
      )
      .innerJoin('item.info', 'info')
      .addSelect(['info.name', 'info.imageUrl'])
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffices)',
        {
          slsOffices: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .leftJoin(
        'item.excludeConfigs',
        'excludeConfigs',
        'excludeConfigs.key in (:...excludeKeys) AND excludeConfigs.validFrom <= now() AND excludeConfigs.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .innerJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .andWhere('excludeConfigs.itemId IS NULL')
      .andWhere('voucher.type = :voucherType', {
        voucherType: LegacyVoucherTypeEnum.FREE_PRODUCT,
      })
      .andWhere('voucher.status = :voucherStatus', {
        voucherStatus: VoucherStatus.ACTIVE,
      })
      .andWhere('redemptions.custId = :externalId', {
        externalId: identity.externalId,
      })
      .andWhere('redemptions.status = :redemptionStatus', {
        redemptionStatus: LegacyCustomerRewardStatusEnum.NOT_USED,
      })
      .andWhere('redemptions.expiredDate >= DATE(now())')
      .andWhere('info.type = :type', { type })
      .andWhere('item.isActive')
      .andWhere('info.name IS NOT NULL')
      .andWhere(
        new Brackets((qb) => {
          qb.orWhere('customer.custId = :externalId', {
            externalId: identity.externalId,
          });
          if (identity.division.dry) {
            qb.orWhere(
              new Brackets((qb) => {
                qb.andWhere('customer.slsOffice = :drySlsOffice', {
                  drySlsOffice: identity.division.dry!.salesOffice,
                });
                qb.andWhere('customer.custGroup = :dryCustGroup', {
                  dryCustGroup: identity.division.dry!.group,
                });
                qb.andWhere(`(customer.custId = '') IS NOT FALSE`);
              }),
            );
          }
          if (identity.division.frozen) {
            qb.orWhere(
              new Brackets((qb) => {
                qb.andWhere('customer.slsOffice = :frozenSlsOffice', {
                  frozenSlsOffice: identity.division.frozen!.salesOffice,
                });
                qb.andWhere('customer.custGroup = :frozenCustGroup', {
                  frozenCustGroup: identity.division.frozen!.group,
                });
                qb.andWhere(`(customer.custId = '') IS NOT FALSE`);
              }),
            );
          }
        }),
      );

    const { dry, frozen } = identity.division;
    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    if (isRetailS) {
      query.leftJoin(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );

      if (
        identity.division.dry?.isRetailS &&
        identity.division.frozen?.isRetailS
      ) {
        query.andWhere('retailConfigs.itemId IS NOT NULL');
      } else if (identity.division.dry?.isRetailS) {
        query.andWhere(
          `((retailConfigs.itemId IS NOT NULL AND info.type = 'DRY') OR info.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        query.andWhere(
          `((retailConfigs.itemId IS NOT NULL AND info.type = 'FROZEN') OR info.type = 'DRY')`,
        );
      }
    }

    const vouchers = await query.getMany();

    const allVouchers: FreeProductReadModel[] = [];
    for (const voucher of vouchers) {
      const item = voucher.customer.material!.item!;
      const exists = allVouchers.find((v) => v.id === item.id);
      const intermediate = SalesUtil.getEffectiveBaseUom(
        item.baseUom,
        item.uoms.map((x) => ({
          tier: SalesTier.create(x.tier),
          name: x.uom,
          qty: PackQty.create(x.packQty),
        })),
      );

      let qty = voucher.qty;
      if (voucher.uom === item.packUom) {
        qty *= item.packQty || 1;
      } else if (voucher.uom === item.baseUom) {
        qty = voucher.qty;
      } else {
        if (intermediate.name !== voucher.uom) continue;

        qty *= intermediate.qty.value;
      }

      if (exists) {
        exists.qty.add(Quantity.create(qty));
      } else {
        const uoms: ISalesUom[] = [
          {
            name: item.baseUom,
            qty: PackQty.create(1),
            tier: SalesTier.create(1),
          },
        ];
        if (intermediate) {
          uoms.push({
            name: intermediate.name,
            qty: intermediate.qty,
            tier: SalesTier.create(2),
          });
        }
        if (item.packUom) {
          uoms.push({
            name: item.packUom,
            qty: PackQty.create(item.packQty || 1),
            tier: SalesTier.create(3),
          });
        }

        allVouchers.push(
          new FreeProductReadModel({
            id: item.id,
            externalId: item.externalId,
            imageUrl: item.info!.imageUrl,
            name: item.info!.name!,
            qty: Quantity.create(qty),
            uoms: {
              base: {
                uom: item.baseUom,
                contains: PackQty.create(1),
              },
              intermediate: intermediate
                ? {
                    uom: intermediate.name,
                    contains: intermediate.qty,
                  }
                : null,
              pack: item.packUom
                ? {
                    uom: item.packUom,
                    contains: PackQty.create(item.packQty || 1),
                  }
                : null,
            },
          }),
        );
      }
    }

    allVouchers.forEach((voucher) => voucher.applyVoucher());

    return allVouchers;
  }

  private parseItemMg2(item: TypeOrmItemEntity): string | undefined {
    return item.salesConfigs[0]?.tags
      .find((x) => x.startsWith(TAG_KEY_MATERIAL_GROUP_2.concat(':')))
      ?.split(':')[1];
  }
}
