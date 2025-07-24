import { DataSource } from 'typeorm';

import { InjectDataSource } from '@nestjs/typeorm';
import { KeyUtil } from '@wings-corporation/utils';
import { BaseReadRepository, SalesUtil } from '@wings-online/common';

import { TypeOrmProductViewEntity } from '../entities';
import { FindParams, IProductViewsReadRepository } from '../interfaces';
import { ProductViewReadModel } from '../read-models/product-view.read-model';

export class TypeOrmProductViewsReadRepository
  extends BaseReadRepository
  implements IProductViewsReadRepository
{
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /**
   *
   * @param id
   */
  async find(params: FindParams): Promise<ProductViewReadModel[]> {
    const { identity, categoryId } = params;
    const query = this.dataSource
      .createQueryBuilder(TypeOrmProductViewEntity, 'views')
      .innerJoinAndSelect('views.item', 'item')
      .innerJoinAndSelect('item.info', 'info')
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...keys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        { keys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .andWhere('exclusions.itemId IS NULL')
      .innerJoinAndSelect(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .andWhere('item.isActive IS true')
      .andWhere('item.entity = :entity', { entity: identity.organization })
      .andWhere({ buyerId: identity.id });

    if (categoryId) {
      query.andWhere('info.categoryId = :categoryId', {
        categoryId: categoryId,
      });
    }

    const entities = await query.orderBy('views.createdAt', 'DESC').getMany();

    return entities.map((entity) => this.toReadModel(entity));
  }

  private toReadModel(entity: TypeOrmProductViewEntity): ProductViewReadModel {
    const salesConfig = SalesUtil.getEffectiveSalesConfig(
      entity.item.salesConfigs.map((config) =>
        SalesUtil.mapToSalesItemConfig(config),
      ),
    );
    return new ProductViewReadModel({
      productId: entity.itemId,
      externalId: entity.item.externalId,
      imageUrl: entity.item.info.imageUrl,
      viewedAt: entity.createdAt,
      itemName: entity.item.info.name,
      tags: salesConfig?.tags.map((t) => t.toString()) || [],
    });
  }
}
