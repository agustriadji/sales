import { faker } from '@faker-js/faker';
import { Quantity } from '@wings-corporation/domain';

import { CartItemTag } from './cart-item-tag.entity';
import { Tag } from './tag.vo';

describe('CartItemTagEntity', () => {
  describe('updateTotalQty()', () => {
    it('should not mark entity as dirty given totalQty value is the same as before', () => {
      const id = faker.string.uuid();
      const tag = Tag.create({ key: 'grp01', value: 'value' });
      const totalQty = Quantity.create(faker.number.int({ min: 1, max: 100 }));
      const cartItemTag = CartItemTag.create({ tag, totalQty }, id);

      const newTotalQty = Quantity.create(totalQty.value);

      cartItemTag.updateTotalQty(newTotalQty);

      expect(cartItemTag.isDirty).toBeFalsy();
    });

    it('should mark entity as dirty given totalQty value is different from before', () => {
      const id = faker.string.uuid();
      const tag = Tag.create({ key: 'grp01', value: 'value' });
      const totalQty = Quantity.create(faker.number.int({ min: 1, max: 100 }));
      const cartItemTag = CartItemTag.create({ tag, totalQty }, id);

      const newTotalQty = Quantity.create(totalQty.value + 1);

      cartItemTag.updateTotalQty(newTotalQty);

      expect(cartItemTag.isDirty).toBeTruthy();
    });
  });
});
