import { faker } from '@faker-js/faker';
import { DivisionEnum } from '@wings-corporation/core';
import { EntityId, Money } from '@wings-corporation/domain';
import {
  ItemId,
  PackQty,
  SalesFactor,
  SalesItemModel,
  Tag,
} from '@wings-online/cart/domains';

export const SalesItemModelStub = {
  generate(
    props: Partial<{
      id: ItemId;
      baseQty: number;
      packQty: number;
      salesFactor: number;
      price: number;
      tags: Tag[];
    }>,
  ): SalesItemModel {
    return {
      id: props.id || EntityId.create(),
      base: {
        uom: faker.science.unit().name,
        contains: PackQty.create(props.baseQty || 1),
      },
      pack: {
        uom: faker.science.unit().name,
        contains: PackQty.create(props.packQty || 1),
      },
      factor: SalesFactor.create(props.salesFactor || 1),
      price:
        props.price === 0
          ? Money.zero()
          : Money.create(props.price || faker.number.int({ min: 100 })),
      tags: props.tags || [],
      isActive: faker.datatype.boolean(),
      type: faker.helpers.enumValue(DivisionEnum),
    };
  },
};
