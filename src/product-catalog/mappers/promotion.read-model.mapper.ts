import { UomType } from '@wings-online/app.constants';
import { PackQty, Tag } from '@wings-online/cart/domains';
import {
  BaseReadModelMapper,
  ISalesUom,
  PromoUtil,
  SalesTier,
  SalesUtil,
  TagCriteria,
} from '@wings-online/common';

import {
  TypeOrmPromoTprTagCriteriaEntity,
  TypeOrmPromoTprTargetEntity,
} from '../entities';
import { UomTypeEnum } from '../promotion';
import {
  DirectPromotionReadModel,
  PromotionBenefit,
  PromotionReadModel,
  StrataAmountPromotionReadModel,
  StrataQtyPromotionReadModel,
} from '../read-models';

type PromotionProps = TypeOrmPromoTprTargetEntity & { isRetailS: boolean };

export class PromotionMapper extends BaseReadModelMapper<
  PromotionProps,
  PromotionReadModel | undefined
> {
  toReadModel(target: PromotionProps) {
    const promo = target.promo;

    if (!promo) return;

    // filter promotions that use a destination code but no destination code info matches the buyer info
    if (promo.useDestCode && !promo.destCodes.some((x) => x.destCodeInfo)) {
      return;
    }

    let tagCriteria: TagCriteria | undefined;
    if (promo.tagCriteria) {
      tagCriteria = this.mapToTagCriteria(promo.tagCriteria, target.isRetailS);
      if (!tagCriteria) return;
    }

    let promotion: PromotionReadModel;

    if (target.type === 'DIRECT') {
      const benefit = target.benefit;
      if (!benefit) return;

      promotion = new DirectPromotionReadModel({
        id: promo.id,
        type: target.type,
        externalType: promo.externalType,
        priority: promo.priority,
        target: {
          tag: target.tag,
          itemId: target.itemId,
          priority: target.priority,
        },
        externalId: promo.externalId,
      });

      let promotionBenefit: PromotionBenefit;
      if (
        target.benefit.freeItemQty &&
        target.benefit.freeItemUomType &&
        target.benefit.freeItem &&
        target.benefit.freeItem.info &&
        !target.benefit.freeItem.exclusions?.length &&
        target.benefit.freeItem.prices?.length &&
        target.benefit.freeItem.salesConfigs?.length &&
        (!target.isRetailS || target.benefit.freeItem.retailConfigs?.length)
      ) {
        const item = target.benefit.freeItem;
        const uoms: ISalesUom[] = item.uoms.map((x) => ({
          tier: SalesTier.create(x.tier),
          name: x.uom,
          qty: PackQty.create(x.packQty),
        }));

        const intermediateUom = SalesUtil.getEffectiveBaseUom('', uoms);
        promotionBenefit = PromoUtil.resolvePromotionBenefit(
          benefit,
          {
            qty: target.scaleQty,
            uom: target.scaleUomType,
          },
          {
            id: target.benefit.freeItemId,
            name: item.info.name,
            benefitQty: target.benefit.freeItemQty,
            benefitUom: target.benefit.freeItemUomType,
            uom: {
              base: item.baseUom as UomType,
              baseQty: PackQty.create(1),
              intermediate: item.uoms.length
                ? (intermediateUom.name as UomType)
                : null,
              intermediateQty: item.uoms.length ? intermediateUom.qty : null,
              pack: item.packUom ? (item.packUom as UomType) : null,
              packQty: item.packQty ? PackQty.create(item.packQty) : null,
            },
          },
        );
        promotion.setCondition({
          promotionIds: [promo.id],
          priorities: [promo.priority],
          minQty: promotionBenefit.product?.scaleQty || 1,
          minQtyUomType:
            promotionBenefit.product?.scaleUomType || UomTypeEnum.BASE,
          benefit: promotionBenefit,
        });
      } else if (target.benefit.type) {
        promotionBenefit = PromoUtil.resolvePromotionBenefit(benefit, {
          qty: target.scaleQty,
          uom: target.scaleUomType,
        });

        promotion.setCondition({
          promotionIds: [promo.id],
          priorities: [promo.priority],
          minQty: promo.tagCriteria?.tagMinQty || 1,
          minQtyUomType: promo.tagCriteria?.tagMinUomType || UomTypeEnum.BASE,
          benefit: promotionBenefit,
          tagCriteria: tagCriteria
            ? {
                ...tagCriteria,
                isItemHasMatchingTag: target.itemId === '*',
              }
            : undefined,
        });
      } else {
        return;
      }
    } else {
      const criterias = target.criterias.filter((c) => c.benefit);
      if (criterias.length === 0) return;

      if (criterias[0].minQty !== undefined && !criterias[0].minPurchase) {
        promotion = new StrataQtyPromotionReadModel({
          id: promo.id,
          type: target.type,
          externalType: promo.externalType,
          priority: promo.priority,
          target: {
            tag: target.tag,
            itemId: target.itemId,
            priority: target.priority,
          },
          externalId: promo.externalId,
        });

        for (const criteria of criterias) {
          promotion.addCondition({
            promotionIds: [promo.id],
            priorities: [promo.priority],
            minQty: criteria.minQty,
            minQtyUomType: criteria.minQtyUomType!,
            benefit: PromoUtil.resolvePromotionBenefit(criteria.benefit, {
              qty: target.scaleQty,
              uom: target.scaleUomType,
            }),
            tagCriteria: tagCriteria
              ? {
                  ...tagCriteria,
                  isItemHasMatchingTag: target.itemId === '*',
                }
              : undefined,
          });
        }
      } else {
        if (target.itemId === '*') return; // only handle strata amount promotion for item specific target

        promotion = new StrataAmountPromotionReadModel({
          id: promo.id,
          type: target.type,
          externalType: promo.externalType,
          priority: promo.priority,
          target: {
            itemId: target.itemId,
            tag: '*',
            priority: target.priority,
          },
          externalId: promo.externalId,
        });

        for (const criteria of criterias) {
          promotion.addCondition({
            promotionIds: [promo.id],
            priorities: [promo.priority],
            minAmount: criteria.minPurchase,
            benefit: PromoUtil.resolvePromotionBenefit(criteria.benefit, {
              qty: target.scaleQty,
              uom: target.scaleUomType,
            }),
          });
        }
      }
    }

    return promotion;
  }

  private mapToTagCriteria(
    tagCriteria: TypeOrmPromoTprTagCriteriaEntity,
    isRetailS: boolean,
  ): TagCriteria | undefined {
    const validIncludeItems = tagCriteria.includedItemInfos.filter(
      (x) =>
        x.item &&
        x.item.prices.length &&
        !x.item.exclusions.length &&
        x.item.salesConfigs.length &&
        (!isRetailS || x.item.retailConfigs?.length),
    );

    if (validIncludeItems.length !== tagCriteria.includedItemIds.length) {
      return;
    }

    return {
      items: tagCriteria.includedItemInfos.map((x) => ({
        id: x.itemId,
        name: x.name,
        uom: {
          base: x.item.baseUom,
          intermediate: x.item.uoms.length
            ? SalesUtil.getEffectiveBaseUom(
                '',
                x.item.uoms.map((x) => ({
                  tier: SalesTier.create(x.tier),
                  qty: PackQty.create(x.packQty),
                  name: x.uom,
                })),
              ).name
            : undefined,
          pack: x.item.packUom,
        },
      })),
      itemMinQty: tagCriteria.includedItemMinQty || 0,
      itemMinUomType: tagCriteria.includedItemMinUomType || UomTypeEnum.BASE,
      isItemHasMatchingTag: true,
      minItemCombination: tagCriteria.minItemCombination,
      isRatioBased: tagCriteria.isRatioBased,
      includedTag: tagCriteria.includedTag
        ? Tag.fromString(tagCriteria.includedTag)
        : undefined,
      includedTagMinQty: tagCriteria.includedTagMinQty || 0,
      includedTagMinUomType:
        tagCriteria.includedTagMinUomType || UomTypeEnum.BASE,
    };
  }
}
