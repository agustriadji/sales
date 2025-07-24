import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { KeyUtil } from '@wings-corporation/utils';
import { SalesUtil, UserIdentity } from '@wings-online/common';

import {
  TypeOrmDestCodeEntity,
  TypeOrmItemEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmPromoTprDestCodeEntity,
  TypeOrmPromoTprEntity,
  TypeOrmPromoTprTargetEntity,
} from '../entities';
import { IProductHelperRepository } from '../interfaces';
import { ProductType } from '../product-catalog.constants';
import { TypeOrmItemInfoEntity } from '../promotion';
import { PromoUtils } from '../utils/promo.util';

@Injectable()
export class TypeOrmProductHelperRepository
  implements IProductHelperRepository
{
  constructor(private readonly dataSource: DataSource) {}

  public getValidProductQuery(identity: UserIdentity) {
    const { dry, frozen } = identity.division;
    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    const query = this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .select('1')
      .innerJoin('item.info', 'item_info')
      .andWhere('item.isActive = true')
      .andWhere('item.entity = :entity', { entity: identity.organization })
      .innerJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .andWhere('exclusions.itemId IS NULL')
      .innerJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      );

    const dryOnly = dry && !frozen;
    const frozenOnly = !dry && frozen;
    if (dryOnly || frozenOnly) {
      query.andWhere('item_info.type = :type', {
        type: dryOnly ? ProductType.DRY : ProductType.FROZEN,
      });
    }

    if (isRetailS) {
      query.leftJoinAndSelect(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );

      if (
        identity.division.dry?.isRetailS &&
        identity.division.frozen?.isRetailS
      ) {
        query.andWhere('retailConfigs.itemId IS NOT NULL');
      } else if (identity.division.dry?.isRetailS) {
        query.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR item_info.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        query.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR item_info.type = 'DRY')`,
        );
      }
    }

    return query;
  }

  public joinPromoTPRQuery<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    identity: UserIdentity,
    itemAlias = 'item',
    salesConfigAlias = 'salesConfigs',
  ): SelectQueryBuilder<T> {
    const prefixTargets = PromoUtils.getPromoTPRTargets(identity);
    const targets = PromoUtils.getPromoTPRTargets(identity, false);
    const { dry, frozen } = identity.division;

    const conditions = {
      dry: dry && !frozen ? `AND freeItemInfo.type = 'DRY'` : '',
      frozen: !dry && frozen ? `AND freeItemInfo.type = 'FROZEN'` : '',
    };

    query
      .leftJoinAndMapMany(
        `${itemAlias}.promoTPRTargets`,
        TypeOrmPromoTprTargetEntity,
        'tprTarget',
        `(${itemAlias}.id::text = tprTarget.itemId OR tprTarget.tag = ANY(${salesConfigAlias}.tags)) AND
                tprTarget.salesOrg in (:...salesOrgs) AND
                tprTarget.distChannel in (:...distChannels) AND
                tprTarget.salesOffice in (:...salesOffices) AND
                tprTarget.salesGroup in (:...salesGroups) AND
                tprTarget.group in (:...groups) AND
                tprTarget.buyerExternalId in (:...buyerExternalIds) AND
                tprTarget.periodFrom <= now() AND
                tprTarget.periodTo >= now()`,
        {
          salesOrgs: prefixTargets.salesOrgs,
          distChannels: prefixTargets.distChannels,
          salesOffices: prefixTargets.salesOffices,
          salesGroups: prefixTargets.salesGroups,
          groups: prefixTargets.groups,
          buyerExternalIds: prefixTargets.buyerExternalIds,
        },
      )
      .leftJoinAndMapOne(
        'tprTarget.promo',
        TypeOrmPromoTprEntity,
        'tprPromo',
        `tprPromo.id = tprTarget.promoId AND tprPromo.entity = :entity`,
      )
      .leftJoinAndMapMany(
        'tprPromo.destCodes',
        TypeOrmPromoTprDestCodeEntity,
        'tpr_dest',
        `tprPromo.id = tpr_dest.promoId`,
      )
      .leftJoinAndMapOne(
        'tpr_dest.destCodeInfo',
        TypeOrmDestCodeEntity,
        'tprDestInfo',
        `tprDestInfo.destCode = tpr_dest.dest_code
                AND tprDestInfo.salesOrgs && ARRAY[:...salesOrgsNonPrefix]::varchar[] 
                AND tprDestInfo.distChannels && ARRAY[:...distChannelsNonPrefix]::varchar[] 
                AND tprDestInfo.divisions && ARRAY[:...divisionsNonPrefix]::varchar[] 
                AND tprDestInfo.salesOffices && ARRAY[:...salesOfficesNonPrefix]::varchar[] 
                AND tprDestInfo.salesGroups && ARRAY[:...salesGroupsNonPrefix]::varchar[] 
                AND tprDestInfo.groups && ARRAY[:...groupsNonPrefix]::varchar[] 
                AND tprDestInfo.buyerExternalIds && ARRAY[:...buyerExternalIdsNonPrefix]::varchar[] 
                AND tprDestInfo.hierarchies && ARRAY[:...hierarchiesNonPrefix]::varchar[] 
                AND NOT (:buyerExternalId = ANY(tprDestInfo.excludedBuyerExternalIds))
                AND NOT (ARRAY[:...groupsNonPrefix]::varchar[] && tprDestInfo.excludedGroups)`,
        {
          salesOrgsNonPrefix: targets.salesOrgs,
          distChannelsNonPrefix: targets.distChannels,
          divisionsNonPrefix: targets.divisions,
          salesOfficesNonPrefix: targets.salesOffices,
          salesGroupsNonPrefix: targets.salesGroups,
          groupsNonPrefix: targets.groups,
          buyerExternalIdsNonPrefix: targets.buyerExternalIds,
          hierarchiesNonPrefix: targets.hierarchies,
          buyerExternalId: identity.externalId,
        },
      )
      .leftJoinAndSelect('tprTarget.benefit', 'tprTargetBenefit')
      .leftJoinAndMapOne(
        'tprTargetBenefit.freeItem',
        TypeOrmItemEntity,
        'freeItem',
        'freeItem.id = tprTargetBenefit.free_item_id AND freeItem.isActive = true AND freeItem.entity = :entity',
        {
          entity: identity.organization,
        },
      )
      .leftJoinAndMapOne(
        'freeItem.info',
        TypeOrmItemInfoEntity,
        'freeItemInfo',
        `freeItem.id = freeItemInfo.item_id ${conditions.dry}${conditions.frozen}`,
      )
      .leftJoinAndMapMany(
        'freeItem.uoms',
        TypeOrmItemSalesUomEntity,
        'freeItemUoms',
        'freeItem.id = freeItemUoms.itemId and freeItemUoms.slsOffice in (:...slsOffice)',
      )
      .leftJoinAndSelect(
        'freeItem.prices',
        'freeItemPrices',
        'freeItemPrices.priceKey in (:...priceKeys) AND freeItemPrices.validFrom <= now() AND freeItemPrices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'freeItem.salesConfigs',
        'freeItemSalesConfigs',
        'freeItemSalesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'freeItem.exclusions',
        'freeItemExclusions',
        'freeItemExclusions.key in (:...excludeKeys) AND freeItemExclusions.validFrom <= now() AND freeItemExclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .leftJoinAndSelect('tprTarget.criterias', 'tprCriteria')
      .leftJoinAndSelect('tprCriteria.benefit', 'tprCriteriaBenefit')
      .leftJoinAndSelect('tprPromo.tagCriteria', 'tprTagCriteria')
      .leftJoinAndMapMany(
        'tprTagCriteria.includedItemInfos',
        TypeOrmItemInfoEntity,
        'includedItemInfo',
        `includedItemInfo.item_id = ANY(tprTagCriteria.includedItemIds)`,
      )
      .leftJoinAndMapOne(
        'includedItemInfo.item',
        TypeOrmItemEntity,
        'includedItem',
        'includedItem.id = includedItemInfo.item_id AND includedItem.is_active = true',
      )
      .leftJoinAndMapMany(
        'includedItem.uoms',
        TypeOrmItemSalesUomEntity,
        'includedItemUom',
        'includedItemUom.itemId = includedItem.id and includedItemUom.slsOffice in (:...slsOffice)',
      )
      .leftJoinAndSelect(
        'includedItem.salesConfigs',
        'includedItemSalesConfig',
        'includedItemSalesConfig.key in (:...salesConfigsKeys)',
      )
      .leftJoinAndSelect(
        'includedItem.prices',
        'includedItemPrice',
        'includedItemPrice.priceKey in (:...priceKeys) AND includedItemPrice.validFrom <= now() AND includedItemPrice.validTo >= now()',
      )
      .leftJoinAndSelect(
        'includedItem.exclusions',
        'includedItemExclusion',
        'includedItemExclusion.key in (:...excludeKeys) AND includedItemExclusion.validFrom <= now() AND includedItemExclusion.validTo >= now()',
      );

    if (SalesUtil.isRetailS(identity)) {
      query
        .leftJoinAndSelect(
          'freeItem.retailConfigs',
          'freeItemRetailConfigs',
          'freeItemRetailConfigs.key in (:...retailConfigKeys) AND freeItemRetailConfigs.validFrom <= now() AND freeItemRetailConfigs.validTo >= now()',
          { retailConfigKeys: KeyUtil.getSalesRetailKeys(identity) },
        )
        .leftJoinAndSelect(
          'includedItem.retailConfigs',
          'includedItemRetailConfig',
          'includedItemRetailConfig.key in (:...retailConfigKeys) AND includedItemRetailConfig.validFrom <= now() AND includedItemRetailConfig.validTo >= now()',
        );
    }

    return query;
  }
}
