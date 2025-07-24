import { Injectable } from '@nestjs/common';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { KeyUtil } from '@wings-corporation/utils';
import { UserIdentity } from '@wings-online/common';

import { ProductViews } from '../domains';
import { ProductView } from '../domains/product-view.entity';
import { TypeOrmProductViewEntity } from '../entities';
import { IProductViewsWriteRepository } from '../interfaces';

@Injectable()
export class TypeOrmProductViewsWriteRepository
  implements IProductViewsWriteRepository
{
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  /**
   *
   * @param identity
   * @returns
   */
  async find(identity: UserIdentity): Promise<ProductViews> {
    const entities = await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmProductViewEntity, 'views')
      .innerJoin('views.item', 'item')
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...keys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        { keys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .andWhere('exclusions.itemId IS NULL')
      .andWhere('item.entity = :entity', { entity: identity.organization })
      .andWhere('views.buyerId = :id', { id: identity.id })
      .getMany();

    const views = ProductViews.create(
      {
        views: entities.map((view) => {
          return ProductView.create(
            {
              productId: view.itemId,
              viewedAt: view.createdAt,
            },
            view.id,
          );
        }),
        // @BEN 2024-09-11 for testing purposes
        // maxViews: 1,
      },
      identity.id,
    );

    return views;
  }
  /**
   *
   * @param views
   */
  async save(views: ProductViews): Promise<void> {
    for (const view of views.props.views) {
      if (view.isTransient) {
        // insert
        await this.uowService
          .getEntityManager()
          .insert(TypeOrmProductViewEntity, {
            id: view.id.value,
            buyerId: views.id.value,
            itemId: view.props.productId.value,
            createdAt: view.props.viewedAt,
          });
      } else {
        if (view.isDirty) {
          // update
          await this.uowService.getEntityManager().update(
            TypeOrmProductViewEntity,
            {
              id: view.id.value,
            },
            { createdAt: view.props.viewedAt },
          );
        }
      }
    }

    for (const view of views.props.removedViews) {
      await this.uowService
        .getEntityManager()
        .delete(TypeOrmProductViewEntity, { id: view.id.value });
    }
  }
}
