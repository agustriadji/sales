import { faker } from '@faker-js/faker';
import {
  EntityId,
  Money,
  Quantity,
  WatchedProps,
} from '@wings-corporation/domain';
import { RecommendationType } from '@wings-online/app.constants';
import { CartType } from '@wings-online/cart/cart.constants';
import {
  CheckoutAggregate,
  CheckoutItem,
  CheckoutItemVoucherList,
  GeneralVoucher,
} from '@wings-online/cart/domains';
import { ItemVoucher } from '@wings-online/cart/domains/item-voucher.entity';

import { SalesFactorStub, UomStub } from './common.stub';
import { IdentityStub } from './identity.stub';

type CheckoutStubProps = {
  type: CartType;
  numberOfItems: number;
  minimumTotalAmount: number;
  withoutPrice: boolean;
  maxQty: number;
  maxPrice: number;
  salesFactor: number;
  generalVoucher: GeneralVoucher;
  items: CheckoutItem[];
  withNotSellable: boolean;
  itemVouchers: ItemVoucher[];
};

export const CheckoutStub = {
  generate(props: Partial<CheckoutStubProps>): CheckoutAggregate {
    const numberOfItems =
      props.numberOfItems ?? faker.number.int({ min: 1, max: 100 });
    const minimumTotalAmount = props.minimumTotalAmount ?? faker.number.int();
    const withoutPrice = props.withoutPrice ?? false;
    const isBaseSellable = !props.withNotSellable;
    const isPackSellable = !props.withNotSellable;

    const items: CheckoutItem[] = props.items ?? [];
    if (items.length === 0) {
      for (let i = 0; i < numberOfItems; i++) {
        items.push(
          CheckoutItemStub.generate(
            withoutPrice,
            props.maxQty,
            props.maxPrice,
            props.salesFactor,
            isBaseSellable,
            isPackSellable,
          ),
        );
      }
    }

    const requiredProps = {
      type: props.type || 'DRY',
      deliveryAddressId: EntityId.fromString(faker.string.uuid()),
      minimumTotalAmount: Money.create(minimumTotalAmount),
      items,
      identity: IdentityStub.generate(),
      generalVoucher: new WatchedProps(props.generalVoucher),
      itemVouchers: new CheckoutItemVoucherList(props.itemVouchers),
    };

    return props.generalVoucher
      ? CheckoutAggregate.reconstitute(
          {
            ...requiredProps,
            generalVoucher: new WatchedProps(props.generalVoucher),
            itemFlashSale: [],
            itemRegularPromotions: [],
            itemLifetimePromotions: [],
          },
          faker.string.uuid(),
        )
      : CheckoutAggregate.create(requiredProps);
  },
};

export const CheckoutItemStub = {
  generate(
    withoutPrice = false,
    maxQty = 10,
    maxPrice = 10000,
    salesFactor = 1,
    isBaseSellable = true,
    isPackSellable = true,
  ) {
    return CheckoutItem.create({
      itemId: EntityId.create(),
      externalId: EntityId.fromString(faker.number.int().toString()),
      itemName: faker.word.words(),
      qty: Quantity.create(faker.number.int({ min: 1, max: maxQty })),
      price: withoutPrice
        ? undefined
        : Money.create(faker.number.int({ min: 1, max: maxPrice })),
      salesFactor: SalesFactorStub.generate(salesFactor),
      description: faker.lorem.sentence(5),
      baseUom: UomStub.generate({ qty: 1 }),
      packUom: UomStub.generate({ qty: faker.number.int({ min: 2 }) }),
      tags: [],
      recommendationType: faker.helpers.enumValue(RecommendationType),
      isBaseSellable,
      isPackSellable,
      addedAt: faker.date.recent(),
    });
  },

  withQtyAndSalesFactor(qty: number, salesFactor: number) {
    return CheckoutItem.create({
      itemId: EntityId.create(),
      externalId: EntityId.fromString(faker.number.int().toString()),
      itemName: faker.word.words(),
      qty: Quantity.create(qty),
      price: Money.create(faker.number.int({ min: 1, max: 9999999 })),
      salesFactor: SalesFactorStub.generate(salesFactor),
      description: faker.lorem.sentence(5),
      baseUom: UomStub.generate({ qty: 1 }),
      packUom: UomStub.generate({ qty: faker.number.int({ min: 2 }) }),
      tags: [],
      recommendationType: faker.helpers.enumValue(RecommendationType),
      isBaseSellable: true,
      isPackSellable: true,
      addedAt: faker.date.recent(),
    });
  },
};
