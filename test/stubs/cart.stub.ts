import { faker } from '@faker-js/faker';
import { EntityId, Quantity } from '@wings-corporation/domain';
import { CartType } from '@wings-online/cart/cart.constants';
import {
  CartAggregate,
  CartItem,
  CartItemList,
  SalesFactor,
} from '@wings-online/cart/domains';
import { UserIdentity } from '@wings-online/common';

export class CartStub {
  // TODO need to reconsider stub approach since the current approach doesn't
  // allow handling of when cart should be generate as transient or dirty
  public static generate(
    params?: Partial<{
      buyerId: string;
      items: CartItem[];
      type: CartType;
    }>,
  ) {
    return params?.items
      ? CartAggregate.reconstitute(
          {
            type: params.type || 'DRY',
            buyerId: EntityId.fromString(params.buyerId || faker.string.uuid()),
            deliveryAddressId: EntityId.fromString(faker.string.uuid()),
            items: new CartItemList(params.items),
          },
          faker.string.uuid(),
        )
      : CartAggregate.create({
          type: params?.type || 'DRY',
          buyerId: EntityId.fromString(params?.buyerId || faker.string.uuid()),
          deliveryAddressId: EntityId.fromString(faker.string.uuid()),
        });
  }

  public static generateWithIdentity(identity: UserIdentity): CartAggregate {
    return this.generate({
      buyerId: identity.id,
    });
  }
}

export const CartItemStub = {
  generate(qty?: number) {
    const itemQty = Quantity.create(qty || faker.number.int({ min: 1 }));
    const itemQtyIntermediate = Quantity.create(
      faker.number.int({ min: 1, max: itemQty.value }),
    );
    const itemQtyPack = Quantity.create(
      faker.number.int({ min: 1, max: itemQtyIntermediate.value }),
    );
    return CartItem.create({
      itemId: EntityId.create(),
      qty: itemQty,
      qtyIntermediate: itemQtyIntermediate,
      qtyPack: itemQtyPack,
      salesFactor: SalesFactor.create(faker.number.int({ min: 1 })),
      tags: [],
      isBaseSellable: faker.datatype.boolean(),
      isPackSellable: faker.datatype.boolean(),
      addedAt: faker.date.past(),
    });
  },
};
