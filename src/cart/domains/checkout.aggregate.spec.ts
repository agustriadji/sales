import { faker } from '@faker-js/faker';
import { GeneralVoucherStub, ItemVoucherStub } from '@stubs/voucher.stub';
import { ITEM_VOUCHER_MAX_PERCENTAGE } from '@wings-online/app.constants';
import { CheckoutException } from '@wings-online/cart/exceptions';

import {
  CheckoutItemStub,
  CheckoutStub,
} from '../../../test/stubs/checkout.stub';
import { CheckoutOptions } from './interfaces';

const CheckoutOptionsStub = {
  generate(): CheckoutOptions {
    return {
      deliveryDate: faker.date.future(),
      buyerLocation: {
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
      },
      isSimulatePrice: faker.datatype.boolean(),
    };
  },
};

describe('CheckoutAggregate', () => {
  describe('checkout()', () => {
    it('should throw given there are no items in cart', () => {
      const cart = CheckoutStub.generate({
        numberOfItems: 0,
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.CartIsEmpty,
      );
    });

    it('should throw given there are items that not sellable', () => {
      const cart = CheckoutStub.generate({
        numberOfItems: 2,
        withNotSellable: true,
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.ItemsCannotBeCheckedout,
      );
    });

    it('should throw given there are items without price', () => {
      const cart = CheckoutStub.generate({
        withoutPrice: true,
        salesFactor: 1,
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.ItemsCannotBeCheckedout,
      );
    });

    it('should throw given minimum order amount not met', () => {
      const maxQty = faker.number.int({ min: 1, max: 5 });
      const maxPrice = faker.number.int({ min: 1, max: 1000 });

      const cart = CheckoutStub.generate({
        numberOfItems: 1,
        maxQty,
        maxPrice,
        minimumTotalAmount: faker.number.int({ min: maxQty * maxPrice + 1 }),
        salesFactor: 1,
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.MinimumOrderNotMet,
      );
    });

    it('should throw given item quantity is not a multiple of sales factor', () => {
      const salesFactor = faker.number.int({ min: 2, max: 10 });
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        salesFactor,
        withNotSellable: false,
        items: [
          CheckoutItemStub.withQtyAndSalesFactor(salesFactor, salesFactor),
          CheckoutItemStub.withQtyAndSalesFactor(salesFactor + 1, salesFactor),
        ],
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.QuantityMustBeAFactorOf,
      );
    });

    it('should throw given general voucher minimum purchase amount not met', () => {
      const minPurchase = faker.number.int({ min: 1000, max: 100000 });
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        numberOfItems: 1,
        maxPrice: minPurchase - 1,
        maxQty: 1,
        generalVoucher: GeneralVoucherStub.generate({
          minPurchase,
        }),
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.VoucherMinimumPurchaseNotMet,
      );
    });

    it('should throw given item of item voucher not found in cart', () => {
      const item = CheckoutItemStub.generate(false, 1);
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        numberOfItems: 0,
        items: [item],
        itemVouchers: [
          ItemVoucherStub.generate({
            itemId: item.itemId.value + 1,
            minAmount: 1,
          }),
        ],
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.VoucherItemNotInCart,
      );
    });

    it('should throw given item voucher minimum purchase amount not met', () => {
      const item = CheckoutItemStub.generate(false, 1);
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        numberOfItems: 0,
        items: [item],
        itemVouchers: [
          ItemVoucherStub.generate({
            itemId: item.itemId.value,
            minAmount: faker.number.int({ min: (item.price?.value || 0) + 1 }),
          }),
        ],
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.VoucherMinimumPurchaseNotMet,
      );
    });

    it('should throw given total voucher discount exceed max discount', () => {
      const item = CheckoutItemStub.generate(false, 1);
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        numberOfItems: 0,
        items: [item],
        itemVouchers: [
          ItemVoucherStub.generate({
            itemId: item.itemId.value,
            minAmount: 1,
            discountPercentage: ITEM_VOUCHER_MAX_PERCENTAGE + 1,
          }),
        ],
      });
      expect(() => cart.checkout(CheckoutOptionsStub.generate())).toThrow(
        CheckoutException.VoucherExceedMaxDiscount,
      );
    });

    it('should raise checkout event', () => {
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        salesFactor: 1,
      });
      cart.checkout(CheckoutOptionsStub.generate());
      expect(cart.flushEvents().length).toEqual(1);
    });
  });

  describe('applyVoucher()', () => {
    it('should throw given general voucher minimum purchase amount not met', () => {
      const minPurchase = faker.number.int({ min: 1000, max: 100000 });
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        numberOfItems: 1,
        maxPrice: minPurchase - 1,
        maxQty: 1,
      });
      const generalVoucher = GeneralVoucherStub.generate({
        minPurchase,
      });
      expect(() => cart.applyVoucher(generalVoucher)).toThrow(
        CheckoutException.VoucherMinimumPurchaseNotMet,
      );
    });

    it('should apply voucher to cart', () => {
      const generalVoucher = GeneralVoucherStub.generate({
        minPurchase: 1,
        discountAmount: 1,
      });
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        numberOfItems: 1,
      });
      cart.applyVoucher(generalVoucher);
      expect(cart.props.generalVoucher.getCurrentProps()).toEqual(
        generalVoucher,
      );
    });
  });

  describe('unapplyVoucher()', () => {
    it('should unapply voucher from cart', () => {
      const generalVoucher = GeneralVoucherStub.generate();
      const cart = CheckoutStub.generate({
        minimumTotalAmount: 1,
        salesFactor: 1,
        generalVoucher,
      });
      cart.unapplyVoucher(generalVoucher.id.value);
      expect(cart.props.generalVoucher.getCurrentProps()).toBeNull();
    });
  });
});
