import { uniq } from 'lodash';

import { DivisionEnum } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import { MonetaryBenefit, UserIdentity } from '@wings-online/common';

import {
  MinimumPurchaseAmountCondition,
  MinimumPurchaseCondition,
  isMinimumPurchaseAmountCondition,
  isMinimumPurchaseCondition,
} from '../read-models';

export class PromoUtils {
  public static calculateDiscount(
    price: Money,
    discount: MonetaryBenefit,
    scaleQty: Quantity,
  ): Money {
    if (discount.type === 'PERCENTAGE') {
      return Money.create((price.value * discount.value.value) / 100);
    } else if (discount.type === 'AMOUNT') {
      return Money.create(discount.value.value / scaleQty.value);
    }

    return Money.zero();
  }

  /**
   *
   * @param identity
   * @returns
   */
  public static getPromoTPRTargets(identity: UserIdentity, withPrefix = true) {
    const { dry, frozen } = identity.division;

    const targets = {
      salesOrgs: new Array('*'),
      distChannels: new Array('*'),
      salesOffices: new Array('*'),
      salesGroups: new Array('*'),
      groups: new Array('*'),
      buyerExternalIds: uniq(new Array('*').concat(identity.externalId)),
      hierarchies: uniq(
        new Array('*')
          .concat(dry ? dry.customerHier : [])
          .concat(frozen ? frozen.customerHier : []),
      ),
      divisions: uniq(
        new Array('*')
          .concat(dry ? DivisionEnum.DRY : [])
          .concat(frozen ? DivisionEnum.FROZEN : []),
      ),
    };

    if (withPrefix) {
      targets.salesOrgs = uniq(
        targets.salesOrgs
          .concat(dry ? `*-${dry.salesOrg}` : [])
          .concat(dry ? `dry-${dry.salesOrg}` : [])
          .concat(frozen ? `*-${frozen.salesOrg}` : [])
          .concat(frozen ? `frozen-${frozen.salesOrg}` : []),
      );

      targets.distChannels = uniq(
        targets.distChannels
          .concat(dry ? `*-${dry.distChannel}` : [])
          .concat(dry ? `dry-${dry.distChannel}` : [])
          .concat(frozen ? `*-${frozen.distChannel}` : [])
          .concat(frozen ? `frozen-${frozen.distChannel}` : []),
      );

      targets.salesOffices = uniq(
        targets.salesOffices
          .concat(dry ? `*-${dry.salesOffice}` : [])
          .concat(dry ? `dry-${dry.salesOffice}` : [])
          .concat(frozen ? `*-${frozen.salesOffice}` : [])
          .concat(frozen ? `frozen-${frozen.salesOffice}` : []),
      );

      targets.salesGroups = uniq(
        targets.salesGroups
          .concat(dry ? `*-${dry.salesGroup}` : [])
          .concat(dry ? `dry-${dry.salesGroup}` : [])
          .concat(frozen ? `*-${frozen.salesGroup}` : [])
          .concat(frozen ? `frozen-${frozen.salesGroup}` : []),
      );

      targets.groups = uniq(
        targets.groups
          .concat(dry ? `*-${dry.group}` : [])
          .concat(dry ? `dry-${dry.group}` : [])
          .concat(frozen ? `*-${frozen.group}` : [])
          .concat(frozen ? `frozen-${frozen.group}` : []),
      );
    } else {
      targets.salesOrgs = uniq(
        targets.salesOrgs
          .concat(dry ? dry.salesOrg : [])
          .concat(frozen ? frozen.salesOrg : []),
      );

      targets.distChannels = uniq(
        targets.distChannels
          .concat(dry ? dry.distChannel : [])
          .concat(frozen ? frozen.distChannel : []),
      );

      targets.salesOffices = uniq(
        targets.salesOffices
          .concat(dry ? dry.salesOffice : [])
          .concat(frozen ? frozen.salesOffice : []),
      );

      targets.salesGroups = uniq(
        targets.salesGroups
          .concat(dry ? dry.salesGroup : [])
          .concat(frozen ? frozen.salesGroup : []),
      );

      targets.groups = uniq(
        targets.groups
          .concat(dry ? dry.group : [])
          .concat(frozen ? frozen.group : []),
      );
    }

    return targets;
  }

  public static isCriteriaContainUomType(
    conditions: MinimumPurchaseCondition[] | MinimumPurchaseAmountCondition[],
    uomType: UomType,
  ) {
    return conditions.some((condition) => {
      if (isMinimumPurchaseCondition(condition)) {
        return (
          condition.benefit.discount.some(
            (x) => x.type === 'AMOUNT' && x.scaleUomType === uomType,
          ) ||
          condition.minQtyUomType === uomType ||
          condition.benefit.maxUomType === uomType
        );
      } else if (isMinimumPurchaseAmountCondition(condition)) {
        return (
          condition.benefit.discount.some(
            (x) => x.type === 'AMOUNT' && x.scaleUomType === uomType,
          ) || condition.benefit.maxUomType === uomType
        );
      }
      return false;
    });
  }
}
