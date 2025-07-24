import { faker } from '@faker-js/faker';
import { Money, Quantity } from '@wings-corporation/domain';
import { TagKey } from '@wings-online/app.constants';
import { PackQty, SalesFactor, Tag } from '@wings-online/cart/domains';
import { Uom } from '@wings-online/common';

export const QuantityStub = {
  generate(qty?: number) {
    return Quantity.create(qty || faker.number.int({ min: 1 }));
  },
};

export const MoneyStub = {
  generate(amount?: number) {
    return Money.create(amount || faker.number.int({ min: 1 }));
  },
};

export const PackQtyStub = {
  generate(qty?: number) {
    return PackQty.create(qty || faker.number.int({ min: 1 }));
  },
};

export const SalesFactorStub = {
  generate(qty?: number) {
    return SalesFactor.create(qty || faker.number.int({ min: 1 }));
  },
};

export const TagStub = {
  generate(key?: TagKey, value?: string) {
    return Tag.create({
      key:
        key ||
        faker.helpers.arrayElement([
          'grp01',
          'grp02',
          'grp03',
          'grp04',
          'grp05',
        ]),
      value: value || faker.string.alpha(5),
    });
  },
};

export const UomStub = {
  generate(params?: { qty: number }): Uom {
    return {
      name: faker.lorem.word(),
      packQty: PackQtyStub.generate(params?.qty),
    };
  },
};
