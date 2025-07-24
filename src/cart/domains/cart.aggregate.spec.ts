import { faker } from '@faker-js/faker';
import { createMock } from '@golevelup/ts-jest';
import { CartStub } from '@stubs/cart.stub';
import { QuantityStub, TagStub } from '@stubs/common.stub';
import { IdentityStub } from '@stubs/identity.stub';
import { SalesItemModelStub } from '@stubs/sales-item.stub';
import { EntityId, Quantity } from '@wings-corporation/domain';
import { CartException } from '@wings-online/cart/exceptions';
import { SalesUtil } from '@wings-online/common';

import { CartItem } from './cart-item.entity';
import { CartItemAdded, CartItemQtyChanged, CartItemRemoved } from './events';

describe('CartAggregate', () => {
  describe('putItem()', () => {
    it(`should throw given total quantity is not a factor of sales factor`, () => {
      const identity = IdentityStub.generate();
      const cart = CartStub.generateWithIdentity(identity);
      const item = SalesItemModelStub.generate({
        salesFactor: 2,
      });
      const baseQty = QuantityStub.generate(3);
      const packQty = Quantity.zero();

      expect(() => cart.putItem(identity, item, baseQty, packQty)).toThrow(
        CartException.QuantityMustBeAFactorOf,
      );
    });

    it(`should throw given item price is not available`, () => {
      const identity = IdentityStub.generate();
      const cart = CartStub.generateWithIdentity(identity);
      const item = SalesItemModelStub.generate({
        price: 0,
      });
      const baseQty = QuantityStub.generate();
      const packQty = QuantityStub.generate();

      expect(() => cart.putItem(identity, item, baseQty, packQty)).toThrow(
        CartException.ItemPriceNotAvailable,
      );
    });

    it(`should update qty given item already exists`, () => {
      const itemId = EntityId.create();
      const cartItem = createMock<CartItem>({
        itemId,
        tags: [],
      });
      const cartItems = [cartItem];
      const identity = IdentityStub.generate();
      const cart = CartStub.generate({
        buyerId: identity.id,
        items: cartItems,
      });
      const item = SalesItemModelStub.generate({
        id: itemId,
      });
      const baseQty = QuantityStub.generate();
      const packQty = QuantityStub.generate();

      const newQty = Quantity.create(
        baseQty.value + packQty.value * item.pack!.contains.value,
      );
      const intermediateQty = SalesUtil.getQtyInIntermediate(
        newQty,
        item.base.contains,
      );
      const packQtyQty = SalesUtil.getQtyInPack(newQty, item.pack?.contains);

      cart.putItem(identity, item, baseQty, packQty);

      expect(cartItem.updateQty).toHaveBeenCalledTimes(1);
      expect(cartItem.updateQty).toHaveBeenLastCalledWith(
        newQty,
        intermediateQty,
        packQtyQty,
      );
    });

    it(`should raise CartItemQtyChanged event given item qty was changed`, () => {
      const itemId = EntityId.create();
      const cartItem = createMock<CartItem>({
        itemId,
        tags: [],
      });
      const cartItems = [cartItem];
      const identity = IdentityStub.generate();
      const cart = CartStub.generate({
        buyerId: identity.id,
        items: cartItems,
      });
      const item = SalesItemModelStub.generate({
        id: itemId,
      });
      const baseQty = QuantityStub.generate();
      const packQty = QuantityStub.generate();

      cart.putItem(identity, item, baseQty, packQty);

      const events = cart.flushEvents();

      expect(events.length).toEqual(1);
      expect(events[0]).toBeInstanceOf(CartItemQtyChanged);
    });

    it(`should add new cart item given item was not initially in cart`, () => {
      const itemId = EntityId.create();
      const identity = IdentityStub.generate();
      const cart = CartStub.generateWithIdentity(identity);
      const item = SalesItemModelStub.generate({
        id: itemId,
      });
      const baseQty = QuantityStub.generate();
      const packQty = QuantityStub.generate();

      cart.putItem(identity, item, baseQty, packQty);

      expect(cart.items.getNewItems().length).toEqual(1);
    });

    it(`should raise CartItemAdded given new cart item was added`, () => {
      const itemId = EntityId.create();
      const identity = IdentityStub.generate();
      const cart = CartStub.generateWithIdentity(identity);
      const item = SalesItemModelStub.generate({
        id: itemId,
      });
      const baseQty = QuantityStub.generate();
      const packQty = QuantityStub.generate();

      cart.putItem(identity, item, baseQty, packQty);

      const events = cart.flushEvents();

      expect(events.length).toEqual(1);
      expect(events[0]).toBeInstanceOf(CartItemAdded);
    });

    it(`should adjust tag summary given an item with new tag was added`, () => {
      const identity = IdentityStub.generate();
      const cart = CartStub.generateWithIdentity(identity);
      const itemTags = [
        TagStub.generate('grp01', 'value1'),
        TagStub.generate('grp02', 'value2'),
      ];
      const item = SalesItemModelStub.generate({
        id: EntityId.create(),
        tags: itemTags,
      });
      const baseQty = QuantityStub.generate();
      const packQty = QuantityStub.generate();

      const newQty = Quantity.create(
        baseQty.value + packQty.value * item.pack!.contains.value,
      );

      cart.putItem(identity, item, baseQty, packQty);
      const currentTags = cart.props.tags.getItems();

      expect(currentTags.length).toEqual(2);
      itemTags.forEach((tag) => {
        const foundTag = currentTags.find((t) => t.tag.equals(tag));
        expect(foundTag).toBeDefined();
        expect(foundTag?.qty.value).toEqual(newQty.value);
      });
    });

    it(`should adjust tag summary given an item with overlapping tags was added`, () => {
      const identity = IdentityStub.generate();
      const cart = CartStub.generateWithIdentity(identity);

      const item1 = SalesItemModelStub.generate({
        id: EntityId.create(),
        tags: [TagStub.generate('grp01', 'value1')],
      });
      const qty1 = QuantityStub.generate(faker.number.int());
      cart.putItem(identity, item1, qty1, Quantity.zero());

      const item2 = SalesItemModelStub.generate({
        id: EntityId.create(),
        tags: [
          TagStub.generate('grp01', 'value1'),
          TagStub.generate('grp03', 'value3'),
        ],
      });
      const qty2 = QuantityStub.generate(faker.number.int());
      cart.putItem(identity, item2, qty2, Quantity.zero());

      const currentTags = cart.props.tags.getItems();
      const overlappingTag = currentTags.find(
        (t) => t.tag.key === 'grp01' && t.tag.value === 'value1',
      );

      expect(currentTags.length).toEqual(2);
      expect(overlappingTag?.qty.value).toEqual(qty1.value + qty2.value);
    });

    it(`should adjust tag summary given a cart item was removed`, () => {
      const identity = IdentityStub.generate();
      const cart = CartStub.generateWithIdentity(identity);

      const item1 = SalesItemModelStub.generate({
        id: EntityId.create(),
        tags: [
          TagStub.generate('grp01', 'value1'),
          TagStub.generate('grp02', 'value2'),
        ],
      });
      const item2 = SalesItemModelStub.generate({
        id: EntityId.create(),
        tags: [TagStub.generate('grp01', 'value1')],
      });

      const qty1 = QuantityStub.generate(faker.number.int());
      const qty2 = QuantityStub.generate(faker.number.int());

      cart.putItem(identity, item1, qty1, Quantity.zero());
      cart.putItem(identity, item2, qty2, Quantity.zero());
      cart.putItem(identity, item1, Quantity.zero(), Quantity.zero());

      const currentTags = cart.props.tags.getItems();

      expect(currentTags.length).toEqual(1);
      expect(currentTags[0]?.qty.value).toEqual(qty2.value);
    });
  });

  describe('clear()', () => {
    it('should empty all items from cart', () => {
      const identity = IdentityStub.generate();
      const cart = CartStub.generate();
      const items = [...cart.items.getItems()];

      cart.clear(identity);

      expect(cart.props.items.getItems().length).toEqual(0);
      expect(cart.props.items.getRemovedItems().length).toEqual(items.length);
    });
  });

  describe('removeItem()', () => {
    it('should remove the specified item given item is in the cart', () => {
      const identity = IdentityStub.generate();
      const itemId = EntityId.create();
      const cartItem = createMock<CartItem>({
        itemId,
        tags: [],
      });
      const cartItems = [cartItem];
      const cart = CartStub.generate({ items: cartItems });

      cart.removeItem(identity, itemId.value);

      expect(cart.props.items.getRemovedItems().length).toEqual(1);
    });

    it(`should raise CartItemRemoved given cart item was removed`, () => {
      const identity = IdentityStub.generate();
      const itemId = EntityId.create();
      const cartItem = createMock<CartItem>({
        itemId,
        tags: [],
      });
      const cartItems = [cartItem];
      const cart = CartStub.generate({ items: cartItems });

      cart.removeItem(identity, itemId.value);

      const events = cart.flushEvents();

      expect(events.length).toEqual(1);
      expect(events[0]).toBeInstanceOf(CartItemRemoved);
    });

    it(`should adjust tag summary given cart item was removed`, () => {
      const identity = IdentityStub.generate();
      const itemId = EntityId.create();
      const cartItem = createMock<CartItem>({
        itemId,
        tags: [TagStub.generate('grp01', 'value1')],
      });
      const cartItems = [cartItem];
      const cart = CartStub.generate({ items: cartItems });

      cart.removeItem(identity, itemId.value);

      const currentTags = cart.props.tags.getItems();
      expect(currentTags.length).toEqual(0);
    });
  });

  describe('updateAddress()', () => {
    it('should not mark aggregate as dirty given new address is same with current address', () => {
      const cart = CartStub.generate({
        items: [createMock<CartItem>({ tags: [] })],
      });
      const initialId = cart.props.deliveryAddressId?.value;

      cart.updateAddress(initialId as string);

      expect(cart.isDirty).toEqual(false);
    });

    it('should mark aggregate as dirty given new address is different from current address', () => {
      const cart = CartStub.generate({
        items: [createMock<CartItem>({ tags: [] })],
      });
      const newAddress = faker.string.uuid();

      cart.updateAddress(newAddress);

      expect(cart.props.deliveryAddressId?.value).toEqual(newAddress);
      expect(cart.isDirty).toEqual(true);
    });
  });
});
