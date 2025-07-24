import { faker } from '@faker-js/faker';
import { MoneyStub, QuantityStub, TagStub } from '@stubs/common.stub';
import { EntityId, Money, Quantity } from '@wings-corporation/domain';

import {
  ItemPurchase,
  ItemTagPurchase,
} from '../interfaces/promotion.interface';
import {
  ItemPurchaseAmountBetweenCriterion,
  ItemPurchaseBetweenCriterion,
  ItemTagPurchaseBetweenCriterion,
  MinimumItemPurchaseAmountCriterion,
  MinimumItemPurchaseCriterion,
  MinimumItemTagPurchaseCriterion,
  MinimumPurchaseByItemCriterion,
  MinimumPurchaseByTagCriterion,
} from './promo-criteria.vo';
import { Tag } from './tag.vo';

describe('MinimumItemPurchaseCriterion', () => {
  describe('check()', () => {
    it(`should return false given condition not fulfil criteria`, () => {
      const itemId = EntityId.create();
      const minQty = QuantityStub.generate();
      const criterion = MinimumItemPurchaseCriterion.create({ itemId, minQty });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({ itemId, to: minQty.value - 1 }),
        ),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const itemId = EntityId.create();
      const minQty = QuantityStub.generate();
      const criterion = MinimumItemPurchaseCriterion.create({ itemId, minQty });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({
            itemId,
            from: minQty.value,
            to: minQty.value,
          }),
        ),
      ).toBeTruthy();
    });
  });
});

describe('ItemPurchaseBetweenCriterion', () => {
  describe('check()', () => {
    it(`should return false given condition not fulfil criteria`, () => {
      const itemId = EntityId.create();
      const from = QuantityStub.generate();
      const to = QuantityStub.generate(from.value + 10);
      const criterion = ItemPurchaseBetweenCriterion.create({
        itemId,
        from,
        to,
      });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({ itemId, to: from.value - 1 }),
        ),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const itemId = EntityId.create();
      const from = QuantityStub.generate();
      const to = QuantityStub.generate(from.value + 10);
      const criterion = ItemPurchaseBetweenCriterion.create({
        itemId,
        from,
        to,
      });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({
            itemId,
            from: from.value,
            to: to.value,
          }),
        ),
      ).toBeTruthy();
    });
  });
});

describe('MinimumItemTagPurchaseCriterion', () => {
  describe('check()', () => {
    it(`should return false given condition not fulfil criteria`, () => {
      const tag = TagStub.generate();
      const minQty = QuantityStub.generate();
      const criterion = MinimumItemTagPurchaseCriterion.create({ tag, minQty });

      expect(
        criterion.check({
          tagPurchase: ItemTagPurchaseStub.generate({
            tag,
            items: [ItemPurchaseStub.generate({ to: minQty.value - 1 })],
          }),
          itemPurchase: {},
        }),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const tag = TagStub.generate();
      const minQty = QuantityStub.generate();
      const criterion = MinimumItemTagPurchaseCriterion.create({ tag, minQty });

      expect(
        criterion.check({
          tagPurchase: ItemTagPurchaseStub.generate({
            tag,
            items: [
              ItemPurchaseStub.generate({
                from: minQty.value,
                to: minQty.value,
              }),
            ],
          }),
          itemPurchase: {},
        }),
      ).toBeTruthy();
    });
  });
});

describe('ItemTagPurchaseBetweenCriterion', () => {
  describe('check()', () => {
    it(`should return false given condition not fulfil criteria`, () => {
      const tag = TagStub.generate();
      const from = QuantityStub.generate();
      const to = QuantityStub.generate(from.value + 10);
      const criterion = ItemTagPurchaseBetweenCriterion.create({
        tag,
        from,
        to,
      });

      expect(
        criterion.check({
          tagPurchase: ItemTagPurchaseStub.generate({
            tag,
            items: [ItemPurchaseStub.generate({ to: from.value - 1 })],
          }),
          itemPurchase: {},
        }),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const tag = TagStub.generate();
      const from = QuantityStub.generate();
      const to = QuantityStub.generate(from.value + 10);
      const criterion = ItemTagPurchaseBetweenCriterion.create({
        tag,
        from,
        to,
      });

      expect(
        criterion.check({
          tagPurchase: ItemTagPurchaseStub.generate({
            tag,
            items: [
              ItemPurchaseStub.generate({
                from: from.value,
                to: to.value,
              }),
            ],
          }),
          itemPurchase: {},
        }),
      ).toBeTruthy();
    });
  });
});

describe('MinimumPurchaseByItemCriterion', () => {
  describe('check()', () => {
    it(`should return false given qty not fulfil criteria`, () => {
      const itemId = EntityId.create();
      const minQty = QuantityStub.generate();
      const minAmount = MoneyStub.generate();
      const criterion = MinimumPurchaseByItemCriterion.create({
        itemId,
        minQty,
        minAmount,
      });

      expect(
        criterion.check({
          itemId,
          qty: Quantity.create(faker.number.int({ max: minQty.value - 1 })),
          amount: minAmount,
        }),
      ).toBeFalsy();
    });

    it(`should return false given amount not fulfil criteria`, () => {
      const itemId = EntityId.create();
      const minQty = QuantityStub.generate();
      const minAmount = MoneyStub.generate();
      const criterion = MinimumPurchaseByItemCriterion.create({
        itemId,
        minQty,
        minAmount,
      });

      expect(
        criterion.check({
          itemId,
          qty: minQty,
          amount: Money.create(faker.number.int({ max: minAmount.value - 1 })),
        }),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const itemId = EntityId.create();
      const minQty = QuantityStub.generate();
      const minAmount = MoneyStub.generate();
      const criterion = MinimumPurchaseByItemCriterion.create({
        itemId,
        minQty,
        minAmount,
      });

      expect(
        criterion.check({
          itemId,
          qty: minQty,
          amount: minAmount,
        }),
      ).toBeTruthy();
    });
  });
});

describe('MinimumPurchaseByTagCriterion', () => {
  describe('check()', () => {
    it(`should return false given qty not fulfil criteria`, () => {
      const tag = TagStub.generate();
      const minQty = QuantityStub.generate();
      const minAmount = MoneyStub.generate();
      const criterion = MinimumPurchaseByTagCriterion.create({
        tag,
        minQty,
        minAmount,
      });

      expect(
        criterion.check({
          tag,
          qty: Quantity.create(faker.number.int({ max: minQty.value - 1 })),
          amount: minAmount,
        }),
      ).toBeFalsy();
    });

    it(`should return false given amount not fulfil criteria`, () => {
      const tag = TagStub.generate();
      const minQty = QuantityStub.generate();
      const minAmount = MoneyStub.generate();
      const criterion = MinimumPurchaseByTagCriterion.create({
        tag,
        minQty,
        minAmount,
      });

      expect(
        criterion.check({
          tag,
          qty: minQty,
          amount: Money.create(faker.number.int({ max: minAmount.value - 1 })),
        }),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const tag = TagStub.generate();
      const minQty = QuantityStub.generate();
      const minAmount = MoneyStub.generate();
      const criterion = MinimumPurchaseByTagCriterion.create({
        tag,
        minQty,
        minAmount,
      });

      expect(
        criterion.check({
          tag,
          qty: minQty,
          amount: minAmount,
        }),
      ).toBeTruthy();
    });
  });
});

describe('MinimumItemPurchaseAmountCriterion', () => {
  describe('check()', () => {
    it(`should return false given amount not fulfil criteria`, () => {
      const itemId = EntityId.create();
      const minPurchase = MoneyStub.generate();
      const criterion = MinimumItemPurchaseAmountCriterion.create({
        itemId,
        minPurchase,
      });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({
            itemId,
            subtotal: Money.create(
              faker.number.int({ max: minPurchase.value - 1 }),
            ),
          }),
        ),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const itemId = EntityId.create();
      const minPurchase = MoneyStub.generate();
      const criterion = MinimumItemPurchaseAmountCriterion.create({
        itemId,
        minPurchase,
      });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({
            itemId,
            subtotal: minPurchase,
          }),
        ),
      ).toBeTruthy();
    });
  });
});

describe('ItemPurchaseAmountBetweenCriterion', () => {
  describe('check()', () => {
    it(`should return false given amount not fulfil criteria`, () => {
      const itemId = EntityId.create();
      const from = MoneyStub.generate();
      const to = MoneyStub.generate(from.value + 1000);
      const criterion = ItemPurchaseAmountBetweenCriterion.create({
        itemId,
        from,
        to,
      });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({
            itemId,
            subtotal: Money.create(faker.number.int({ max: from.value - 1 })),
          }),
        ),
      ).toBeFalsy();

      expect(
        criterion.check(
          ItemPurchaseStub.generate({
            itemId,
            subtotal: Money.create(faker.number.int({ min: to.value + 1 })),
          }),
        ),
      ).toBeFalsy();
    });

    it(`should return true given condition fulfil criteria`, () => {
      const itemId = EntityId.create();
      const from = MoneyStub.generate();
      const to = MoneyStub.generate(from.value + 1000);
      const criterion = ItemPurchaseAmountBetweenCriterion.create({
        itemId,
        from,
        to,
      });

      expect(
        criterion.check(
          ItemPurchaseStub.generate({
            itemId,
            subtotal: Money.create(
              faker.number.int({ min: from.value, max: to.value }),
            ),
          }),
        ),
      ).toBeTruthy();
    });
  });
});

export const ItemTagPurchaseStub = {
  generate: (props?: { tag?: Tag; items: ItemPurchase[] }): ItemTagPurchase => {
    const tagItems = props?.items.length
      ? props?.items
      : [ItemPurchaseStub.generate({})];
    return {
      tag: props?.tag || TagStub.generate(),
      qty: tagItems.reduce((acc, item) => acc.add(item.qty), Quantity.zero()),
      qtyIntermediate: tagItems.reduce(
        (acc, item) => acc.add(item.qtyIntermediate),
        Quantity.zero(),
      ),
      qtyPack: tagItems.reduce(
        (acc, item) => acc.add(item.qtyPack),
        Quantity.zero(),
      ),
      subtotal: tagItems.reduce(
        (acc, item) => acc.add(item.subtotal),
        Money.zero(),
      ),
      items: tagItems,
    };
  },
};

export const ItemPurchaseStub = {
  generate: (props?: {
    itemId?: EntityId<string>;
    from?: number;
    to?: number;
    subtotal?: Money;
  }): ItemPurchase => ({
    itemId: props?.itemId || EntityId.create(),
    qty: Quantity.create(
      faker.number.int({ min: props?.from || 1, max: props?.to || 100 }),
    ),
    qtyIntermediate: Quantity.create(
      faker.number.int({ min: props?.from || 1, max: props?.to || 100 }),
    ),
    qtyPack: Quantity.create(
      faker.number.int({ min: props?.from || 1, max: props?.to || 100 }),
    ),
    subtotal:
      props?.subtotal !== undefined ? props.subtotal : MoneyStub.generate(),
    addedAt: faker.date.recent(),
  }),
};
