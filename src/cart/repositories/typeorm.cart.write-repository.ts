import { SelectQueryBuilder } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { EntityId, Quantity } from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { KeyUtil } from '@wings-corporation/utils';
import {
  PurchaseQtyByTag,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';

import { CartType } from '../cart.constants';
import {
  CartAggregate,
  CartFactory,
  CartItem,
  CartItemList,
  CartTag,
  CartTagList,
  SalesFactor,
  Tag,
} from '../domains';
import {
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmCartTagEntity,
} from '../entities';
import { ICartWriteRepository } from '../interfaces';

@Injectable()
export class TypeOrmCartWriteRepository implements ICartWriteRepository {
  constructor(
    private readonly uowService: TypeOrmUnitOfWorkService,
    private readonly factory: CartFactory,
  ) {}

  private getBaseQuery(
    identity: UserIdentity,
  ): SelectQueryBuilder<TypeOrmCartEntity> {
    return this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmCartEntity, 'cart')
      .leftJoinAndSelect('cart.items', 'items')
      .leftJoinAndSelect('cart.tags', 'tag')
      .leftJoinAndSelect('items.item', 'item')
      .leftJoinAndSelect(
        'item.salesConfigs',
        'salesConfig',
        'salesConfig.key IN (:...salesConfigKeys)',
        { salesConfigKeys: KeyUtil.getSalesConfigKeys(identity) },
      )
      .where('cart.buyerId = :buyerId', { buyerId: identity.id });
  }

  async getBuyerCart(
    identity: UserIdentity,
    type: CartType,
  ): Promise<CartAggregate | undefined> {
    const entity = await this.getBaseQuery(identity)
      .andWhere('cart.type = :type', { type })
      .getOne();

    return entity ? this.toAggregate(entity) : undefined;
  }

  async getBuyerCarts(identity: UserIdentity): Promise<CartAggregate[]> {
    const entities = await this.getBaseQuery(identity).getMany();

    return entities.map((entity) => this.toAggregate(entity));
  }

  async save(cart: CartAggregate): Promise<void> {
    if (cart.isTransient) {
      await this.uowService.getEntityManager().insert(TypeOrmCartEntity, {
        id: cart.id.value,
        buyerId: cart.props.buyerId.value,
        deliveryAddressId: cart.props.deliveryAddressId?.value,
        type: cart.props.type,
      });

      await this.uowService.getEntityManager().insert(
        TypeOrmCartItemEntity,
        cart.items.getItems().map((item) => {
          return {
            id: item.id.value,
            cartId: cart.id.value,
            itemId: item.itemId.value,
            qty: item.qty.value,
            qtyIntermediate: item.qtyIntermediate.value,
            qtyPack: item.qtyPack.value,
            salesFactor: item.salesFactor.value,
            isBaseSellable: item.isBaseSellable,
            isPackSellable: item.isPackSellable,
          };
        }),
      );
    } else {
      if (cart.isDirty)
        await this.uowService.getEntityManager().update(
          TypeOrmCartEntity,
          { id: cart.id.value },
          {
            // buyerId: cart.props.buyerId.value,
            deliveryAddressId: cart.props.deliveryAddressId?.value,
            updatedAt: cart.props.updatedAt,
          },
        );

      if (cart.items.getItems().length === 0) {
        await this.uowService.getEntityManager().delete(TypeOrmCartItemEntity, {
          cartId: cart.id.value,
        });
      } else {
        if (cart.items.getNewItems().length > 0) {
          await this.uowService.getEntityManager().insert(
            TypeOrmCartItemEntity,
            cart.items.getNewItems().map((item) => {
              return {
                id: item.id.value,
                cartId: cart.id.value,
                itemId: item.itemId.value,
                qty: item.qty.value,
                qtyIntermediate: item.qtyIntermediate.value,
                qtyPack: item.qtyPack.value,
                salesFactor: item.salesFactor.value,
                isBaseSellable: item.isBaseSellable,
                isPackSellable: item.isPackSellable,
              };
            }),
          );
        }

        if (cart.items.getRemovedItems().length > 0) {
          await this.uowService.getEntityManager().delete(
            TypeOrmCartItemEntity,
            cart.items.getRemovedItems().map((item) => {
              return { id: item.id.value };
            }),
          );
        }

        const changedItems = cart.items
          .getItems()
          .filter((x) => x.isDirty && !x.isTransient);

        for (const item of changedItems) {
          await this.uowService.getEntityManager().update(
            TypeOrmCartItemEntity,
            { id: item.id.value },
            {
              qty: item.qty.value,
              qtyIntermediate: item.qtyIntermediate.value,
              qtyPack: item.qtyPack.value,
              salesFactor: item.salesFactor.value,
              isBaseSellable: item.isBaseSellable,
              isPackSellable: item.isPackSellable,
            },
          );
        }
      }
    }

    await this.saveCartTag(cart);
  }

  private async saveCartTag(cart: CartAggregate): Promise<void> {
    if (cart.tags.getRemovedItems().length > 0)
      await this.uowService.getEntityManager().delete(
        TypeOrmCartTagEntity,
        cart.tags.getRemovedItems().map((item) => {
          return {
            id: item.id.value,
          };
        }),
      );

    for (const item of cart.tags
      .getItems()
      .filter((x) => x.isDirty && !x.isTransient)) {
      await this.uowService.getEntityManager().update(
        TypeOrmCartTagEntity,
        {
          id: item.id.value,
        },
        {
          qty: item.qty.value,
        },
      );
    }

    await this.uowService.getEntityManager().insert(
      TypeOrmCartTagEntity,
      cart.tags.getNewItems().map((item) => {
        return {
          id: item.id.value,
          cartId: cart.id.value,
          tag: item.tag.toString(),
          qty: item.qty.value,
        };
      }),
    );
  }

  async getCartTagsByTags(
    identity: UserIdentity,
    tags: string[],
  ): Promise<PurchaseQtyByTag[]> {
    if (tags.length === 0) return [];

    const entities = await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmCartTagEntity, 'tags')
      .innerJoinAndSelect('tags.cart', 'cart')
      .innerJoinAndSelect('cart.items', 'cartItems')
      .leftJoinAndSelect('cartItems.item', 'item')
      .leftJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .where('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('tags.tag IN (:...tags)', { tags })
      .getMany();

    return entities.map((entity) => ({
      tag: Tag.fromString(entity.tag),
      qty: Quantity.create(entity.qty),
      // TODO: optimize filter cart items by tag
      items: entity.cart.items
        .filter((f) => {
          const salesConfig = SalesUtil.getEffectiveSalesConfig(
            f.item.salesConfigs.map((config) =>
              SalesUtil.mapToSalesItemConfig(config),
            ),
          );
          return (
            f.qty !== 0 &&
            (salesConfig
              ? salesConfig.tags.some((t) =>
                  t.equals(Tag.fromString(entity.tag)),
                )
              : false)
          );
        })
        .map((i) => ({
          itemId: i.itemId,
          qty: Quantity.create(i.qty),
          qtyIntermediate: Quantity.create(i.qtyIntermediate),
          qtyPack: Quantity.create(i.qtyPack),
          addedAt: i.createdAt,
        })),
    }));
  }

  private toAggregate(entity: TypeOrmCartEntity): CartAggregate {
    return this.factory.reconstitute(
      {
        type: entity.type as CartType,
        buyerId: EntityId.fromString(entity.buyerId),
        deliveryAddressId: entity.deliveryAddressId
          ? EntityId.fromString(entity.deliveryAddressId)
          : null,
        tags: new CartTagList(
          entity.tags.map((cartTag) =>
            CartTag.create(
              {
                tag: cartTag.tag,
                qty: cartTag.qty,
              },
              cartTag.id,
            ),
          ),
        ),
        items: new CartItemList(
          entity.items.map((cartItem) =>
            CartItem.create(
              {
                itemId: EntityId.fromString(cartItem.itemId),
                qty: Quantity.create(cartItem.qty),
                qtyIntermediate: Quantity.create(cartItem.qtyIntermediate),
                qtyPack: Quantity.create(cartItem.qtyPack),
                salesFactor: SalesFactor.create(cartItem.salesFactor),
                tags:
                  cartItem.item.salesConfigs[0]?.tags.map((x) =>
                    Tag.fromString(x),
                  ) || [],
                isBaseSellable: cartItem.isBaseSellable,
                isPackSellable: cartItem.isPackSellable,
                addedAt: cartItem.createdAt,
              },
              cartItem.id,
            ),
          ),
        ),
        updatedAt: entity.updatedAt,
      },
      entity.id,
    );
  }
}
