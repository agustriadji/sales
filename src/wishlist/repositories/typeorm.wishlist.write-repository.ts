import { Injectable } from '@nestjs/common';
import { EntityId } from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { UserIdentity } from '@wings-online/common';

import { Wishlist, WishlistItem, WishlistItemList } from '../domains';
import { TypeOrmWishlistEntity, TypeOrmWishlistItemEntity } from '../entities';
import { IWishlistWriteRepository } from '../interfaces';
import { WISHLIST_DEFAULT_WISHLIST_NAME } from '../wishlist.constants';

@Injectable()
export class TypeormWishlistWriteRepository
  implements IWishlistWriteRepository
{
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  async findById(id: string, buyerId: string): Promise<Wishlist | undefined> {
    const entity = await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmWishlistEntity, 'wishlist')
      .leftJoinAndSelect('wishlist.items', 'items')
      .where('wishlist.id = :id AND wishlist.buyerId = :buyerId ', {
        id,
        buyerId,
      })
      .getOne();

    return entity
      ? Wishlist.create(
          {
            ...entity,
            items: new WishlistItemList(
              entity.items.map((item) =>
                WishlistItem.create({
                  wishlistId: EntityId.fromString(item.wishlistId),
                  itemId: EntityId.fromString(item.itemId),
                }),
              ),
            ),
          },
          entity.id,
        )
      : undefined;
  }

  async isNameExists(buyerId: string, name: string): Promise<boolean> {
    return await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmWishlistEntity, 'wishlist')
      .where('lower(wishlist.name) = lower(:name)', { name })
      .andWhere('wishlist.buyerId = :buyerId', { buyerId })
      .limit(1)
      .getExists();
  }

  async save(wishlist: Wishlist): Promise<void> {
    if (wishlist.isTransient) {
      await this.uowService.getEntityManager().insert(TypeOrmWishlistEntity, {
        id: wishlist.id.value,
        buyerId: wishlist.props.buyerId,
        name: wishlist.props.name,
        isDefault: wishlist.props.isDefault,
      });

      for (const item of wishlist.items.getItems()) {
        await this.uowService
          .getEntityManager()
          .insert(TypeOrmWishlistItemEntity, {
            itemId: item.itemId.value,
            wishlistId: wishlist.id.value,
          });
      }
    } else {
      if (wishlist.isDirty)
        await this.uowService
          .getEntityManager()
          .update(
            TypeOrmWishlistEntity,
            { id: wishlist.id.value },
            { name: wishlist.props.name, updatedAt: new Date() },
          );

      if (wishlist.items.getItems().length === 0) {
        await this.uowService
          .getEntityManager()
          .delete(TypeOrmWishlistItemEntity, {
            wishlistId: wishlist.id.value,
          });
      } else {
        if (wishlist.items.getNewItems().length > 0) {
          for (const item of wishlist.items.getNewItems()) {
            await this.uowService
              .getEntityManager()
              .insert(TypeOrmWishlistItemEntity, {
                itemId: item.itemId.value,
                wishlistId: wishlist.id.value,
              });
          }
        }

        if (wishlist.items.getRemovedItems().length > 0) {
          for (const item of wishlist.items.getRemovedItems()) {
            await this.uowService
              .getEntityManager()
              .delete(TypeOrmWishlistItemEntity, {
                itemId: item.itemId.value,
                wishlistId: wishlist.id.value,
              });
          }
        }
      }
    }
  }

  async delete(id: string, identity: UserIdentity): Promise<void> {
    await this.uowService
      .getEntityManager()
      .delete(TypeOrmWishlistEntity, { id });
  }

  async findDefault(buyerId: string): Promise<Wishlist> {
    const entity = await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmWishlistEntity, 'wishlist')
      .leftJoinAndSelect('wishlist.items', 'items')
      .where('wishlist.buyerId = :buyerId', {
        buyerId,
      })
      .andWhere('wishlist.isDefault is true')
      .getOne();

    return entity
      ? Wishlist.create(
          {
            ...entity,
            items: new WishlistItemList(
              entity.items.map((item) =>
                WishlistItem.create({
                  wishlistId: EntityId.fromString(item.wishlistId),
                  itemId: EntityId.fromString(item.itemId),
                }),
              ),
            ),
          },
          entity.id,
        )
      : Wishlist.create({
          buyerId,
          name: WISHLIST_DEFAULT_WISHLIST_NAME,
          isDefault: true,
        });
  }
}
