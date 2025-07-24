import { faker } from '@faker-js/faker';
import { EntityId, Money, Quantity } from '@wings-corporation/domain';
import {
  GeneralVoucher,
  MinimumPurchaseByItemCriterion,
  MinimumPurchaseByTagCriterion,
  MonetaryBenefit,
  PromoPercentage,
  Tag,
} from '@wings-online/cart/domains';
import { ItemVoucher } from '@wings-online/cart/domains/item-voucher.entity';

type GeneralVoucherProps = {
  minPurchase: number;
  maxDiscount: number;
  discountAmount: number;
};

export const GeneralVoucherStub = {
  generate(props?: Partial<GeneralVoucherProps>): GeneralVoucher {
    const minPurchase = props?.minPurchase || faker.number.int({ min: 0 });
    return GeneralVoucher.create({
      minPurchase: Money.create(minPurchase),
      maxDiscount: Money.create(
        props?.maxDiscount || faker.number.int({ min: 1 }),
      ),
      discount: MonetaryBenefit.create(
        Money.create(props?.discountAmount || faker.number.int({ min: 1 })),
      ),
    });
  },
};

export const ItemVoucherStub = {
  generate(
    props: Partial<{
      itemId: string;
      tag: string;
      minAmount: number;
      minQty: number;
      discountPercentage: number;
      maxDiscount: number;
    }>,
  ): ItemVoucher {
    return ItemVoucher.create({
      criteria: props.tag
        ? MinimumPurchaseByTagCriterion.create({
            tag: Tag.fromString(props.tag || faker.string.alpha(5)),
            minAmount: Money.create(
              props.minAmount ?? faker.number.int({ min: 1 }),
            ),
            minQty: Quantity.create(props.minQty ?? 1),
          })
        : MinimumPurchaseByItemCriterion.create({
            itemId: EntityId.fromString(props.itemId ?? faker.string.uuid()),
            minAmount: Money.create(
              props.minAmount ?? faker.number.int({ min: 1 }),
            ),
            minQty: Quantity.create(props.minQty ?? 1),
          }),
      discount: MonetaryBenefit.create(
        PromoPercentage.create(
          props.discountPercentage ??
            faker.number.int({
              min: 1,
              max: 100,
            }),
        ),
      ),
      maxDiscount: props.maxDiscount
        ? Money.create(props.maxDiscount)
        : undefined,
    });
  },
};
