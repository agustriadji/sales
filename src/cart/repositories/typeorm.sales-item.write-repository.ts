import { SelectQueryBuilder } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { EntityId, Money } from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { KeyUtil } from '@wings-corporation/utils';
import {
  PackQty,
  SalesFactor,
  SalesItemConfig,
  SalesItemFactor,
  SalesItemModel,
  SalesItemPrice,
  SalesItemUomReadModel,
  Tag,
} from '@wings-online/cart/domains';
import {
  TypeOrmItemEntity,
  TypeOrmItemSalesUomEntity,
} from '@wings-online/cart/entities';
import {
  ISalesUom,
  SalesTier,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';

import { ISalesItemWriteRepository } from '../interfaces';

@Injectable()
export class TypeOrmSalesItemWriteRepository
  implements ISalesItemWriteRepository
{
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  private getBaseQuery(
    identity: UserIdentity,
  ): SelectQueryBuilder<TypeOrmItemEntity> {
    const queryBuilder = this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmItemEntity, 'item');

    if (SalesUtil.isRetailS(identity)) {
      queryBuilder.leftJoin(
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
        queryBuilder.andWhere('retailConfigs.itemId IS NOT NULL');
      } else if (identity.division.dry?.isRetailS) {
        queryBuilder.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        queryBuilder.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'DRY')`,
        );
      }
    }

    return queryBuilder
      .innerJoin('item.info', 'info')
      .addSelect('info.type')
      .leftJoin(
        'item.excludeConfigs',
        'excludeConfig',
        'excludeConfig.key in (:...excludeKeys) AND excludeConfig.validFrom <= now() AND excludeConfig.validTo >= now()',
        { excludeKeys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .andWhere('excludeConfig.itemId IS NULL')
      .leftJoinAndSelect('item.prices', 'prices')
      .leftJoinAndSelect(
        'item.salesFactors',
        'salesFactors',
        'salesFactors.key in (:...factorKeys) AND salesFactors.validFrom <= now() AND salesFactors.validTo >= now()',
        {
          factorKeys: KeyUtil.getSalesFactorKeys(identity),
        },
      )
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...configKeys)',
        {
          configKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .andWhere(
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .andWhere('item.entity = :entity', { entity: identity.organization });
  }

  async getSalesItem(
    itemId: string,
    identity: UserIdentity,
  ): Promise<SalesItemModel | undefined> {
    const entity = await this.getBaseQuery(identity)
      .andWhere('item.id = :id', { id: itemId })
      .getOne();

    return entity ? this.toSalesItemModel(entity) : undefined;
  }

  async getSalesItems(
    itemIds: string[],
    identity: UserIdentity,
  ): Promise<SalesItemModel[]> {
    if (!itemIds.length) return [];

    const entity = await this.getBaseQuery(identity)
      .andWhere('item.id IN (:...ids)', { ids: itemIds })
      .getMany();

    return entity.map((entity) => this.toSalesItemModel(entity));
  }

  private toSalesItemModel(entity: TypeOrmItemEntity): SalesItemModel {
    const uoms: ISalesUom[] = entity.uoms.map((uom) => ({
      tier: SalesTier.create(uom.tier),
      name: uom.uom,
      qty: PackQty.create(uom.packQty || 1),
    }));
    const baseUom = SalesUtil.getEffectiveBaseUom(entity.baseUom, uoms);
    const factor = SalesUtil.getEffectiveSalesFactor(
      entity.salesFactors.map((x) => {
        return SalesItemFactor.create(
          SalesTier.create(x.tier),
          SalesFactor.create(x.factor),
        );
      }),
    );
    const price = SalesUtil.getEffectiveSalesPrice(
      entity.prices.map((x) => {
        return SalesItemPrice.create(
          SalesTier.create(x.tier),
          Money.create(x.price),
        );
      }),
    );

    const config = SalesUtil.getEffectiveSalesConfig(
      entity.salesConfigs.map((x) => {
        return SalesItemConfig.create({
          key: x.key,
          tags: x.tags.map((tag) => Tag.fromString(tag)),
        });
      }),
    );

    return {
      id: EntityId.fromString(entity.id),
      base: {
        uom: baseUom.name,
        contains: baseUom.qty,
      },
      pack: entity.packUom
        ? {
            uom: entity.packUom,
            contains: PackQty.create(entity.packQty || 1),
          }
        : undefined,
      factor,
      price,
      tags: config ? config.tags : [],
      isActive: entity.isActive,
      type: entity.info.type,
    };
  }

  async getItemsUoms(
    itemIds: string[],
    identity: UserIdentity,
  ): Promise<SalesItemUomReadModel[]> {
    if (!itemIds.length) return [];

    const queryBuilder = this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoinAndSelect('item.info', 'info')
      .leftJoin(
        'item.excludeConfigs',
        'excludeConfig',
        'excludeConfig.key in (:...excludeKeys) AND excludeConfig.validFrom <= now() AND excludeConfig.validTo >= now()',
        { excludeKeys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .innerJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .andWhere('item.isActive = true')
      .andWhere('excludeConfig.itemId IS NULL')
      .andWhere('item.entity = :entity', { entity: identity.organization });

    if (SalesUtil.isRetailS(identity)) {
      queryBuilder.innerJoin('item.retailConfigs', 'retailConfigs');
      queryBuilder.andWhere('retailConfigs.key in (:...retailConfigKeys)', {
        retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
      });
      queryBuilder.andWhere('retailConfigs.validFrom <= now()');
      queryBuilder.andWhere('retailConfigs.validTo >= now()');
    }

    const [items, uoms] = await Promise.all([
      queryBuilder.andWhere('item.id IN (:...itemIds)', { itemIds }).getMany(),
      this.uowService
        .getEntityManager()
        .createQueryBuilder(TypeOrmItemSalesUomEntity, 'uom')
        .where('uom.itemId IN (:...itemIds)', { itemIds })
        .andWhere('uom.slsOffice in (:...slsOffice)', {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        })
        .getMany(),
    ]);

    return items.map((item) => {
      const intermediate = uoms.find((uom) => uom.itemId === item.id);

      return new SalesItemUomReadModel({
        id: EntityId.fromString(item.id),
        externalId: item.externalId,
        name: item.info.name || null,
        imageUrl: item.info.imageUrl || null,
        base: {
          uom: item.baseUom,
          contains: PackQty.create(1),
        },
        intermediate: intermediate
          ? {
              uom: intermediate.uom,
              contains: PackQty.create(intermediate.packQty || 1),
            }
          : null,
        pack: item.packUom
          ? {
              uom: item.packUom,
              contains: PackQty.create(item.packQty || 1),
            }
          : null,
      });
    });
  }
}
