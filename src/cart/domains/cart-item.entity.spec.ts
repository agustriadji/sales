import { faker } from '@faker-js/faker';
import { QuantityStub, SalesFactorStub } from '@stubs/common.stub';
import { EntityId, Quantity } from '@wings-corporation/domain';

import { CartItem } from './cart-item.entity';
import { SalesFactor } from './sales-factor.vo';

describe('CartItemEntity', () => {
  describe('updateQty()', () => {
    it('should not mark entity as dirty given qty value is same as before', () => {
      const id = faker.string.uuid();
      const itemId = EntityId.create();
      const qty = QuantityStub.generate();
      const qtyIntermediate = QuantityStub.generate();
      const qtyPack = QuantityStub.generate();
      const salesFactor = SalesFactorStub.generate();
      const isBaseSellable = faker.datatype.boolean();
      const isPackSellable = faker.datatype.boolean();
      const cartItem = CartItem.create(
        {
          itemId,
          qty,
          qtyIntermediate,
          qtyPack,
          salesFactor,
          tags: [],
          isBaseSellable,
          isPackSellable,
          addedAt: faker.date.past(),
        },
        id,
      );
      const newQuantity = Quantity.create(qty.value);
      const newQuantityIntermediate = Quantity.create(qtyIntermediate.value);
      const newQuantityPack = Quantity.create(qtyPack.value);

      cartItem.updateQty(newQuantity, newQuantityIntermediate, newQuantityPack);

      expect(cartItem.isDirty).toBeFalsy();
    });

    it('should mark entity as dirty given qty value is different from before', () => {
      const id = faker.string.uuid();
      const itemId = EntityId.create();
      const qty = QuantityStub.generate();
      const qtyIntermediate = QuantityStub.generate();
      const qtyPack = QuantityStub.generate();
      const salesFactor = SalesFactorStub.generate();
      const isBaseSellable = faker.datatype.boolean();
      const isPackSellable = faker.datatype.boolean();
      const cartItem = CartItem.create(
        {
          itemId,
          qty,
          qtyIntermediate,
          qtyPack,
          salesFactor,
          tags: [],
          isBaseSellable,
          isPackSellable,
          addedAt: faker.date.past(),
        },
        id,
      );
      const newQuantity = QuantityStub.generate();
      const newQuantityIntermediate = QuantityStub.generate();
      const newQuantityPack = QuantityStub.generate();

      cartItem.updateQty(newQuantity, newQuantityIntermediate, newQuantityPack);

      expect(cartItem.isDirty).toBeTruthy();
    });
  });

  describe('updateSalesFactor()', () => {
    it('should not mark entity as dirty given salesFactor value is same as before', () => {
      const id = faker.string.uuid();
      const itemId = EntityId.create();
      const qty = QuantityStub.generate();
      const qtyIntermediate = QuantityStub.generate();
      const qtyPack = QuantityStub.generate();
      const salesFactor = SalesFactorStub.generate();
      const isBaseSellable = faker.datatype.boolean();
      const isPackSellable = faker.datatype.boolean();
      const cartItem = CartItem.create(
        {
          itemId,
          qty,
          qtyIntermediate,
          qtyPack,
          salesFactor,
          tags: [],
          isBaseSellable,
          isPackSellable,
          addedAt: faker.date.past(),
        },
        id,
      );
      const newSalesFactor = SalesFactor.create(salesFactor.value);

      cartItem.updateSalesFactor(newSalesFactor);

      expect(cartItem.isDirty).toBeFalsy();
    });

    it('should mark entity as dirty given salesFactor value is different from before', () => {
      const id = faker.string.uuid();
      const itemId = EntityId.create();
      const qty = QuantityStub.generate();
      const qtyIntermediate = QuantityStub.generate();
      const qtyPack = QuantityStub.generate();
      const salesFactor = SalesFactorStub.generate();
      const isBaseSellable = faker.datatype.boolean();
      const isPackSellable = faker.datatype.boolean();
      const cartItem = CartItem.create(
        {
          itemId,
          qty,
          qtyIntermediate,
          qtyPack,
          salesFactor,
          tags: [],
          isBaseSellable,
          isPackSellable,
          addedAt: faker.date.past(),
        },
        id,
      );
      const newSalesFactor = SalesFactor.create(faker.number.int({ min: 1 }));

      cartItem.updateSalesFactor(newSalesFactor);

      expect(cartItem.isDirty).toBeTruthy();
    });
  });
});
