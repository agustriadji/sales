import { Brackets, DataSource } from 'typeorm';

import { InjectDataSource } from '@nestjs/typeorm';
import {
  Nullable,
  OrganizationEnum,
  PaginatedCollection,
} from '@wings-corporation/core';
import { EntityId } from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import {
  BannerUtil,
  BaseReadRepository,
  CacheUtil,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';
import { ProductType } from '@wings-online/product-catalog';
import {
  TypeOrmBrandEntity,
  TypeOrmCategoryEntity,
  TypeOrmItemEntity,
  TypeOrmItemInfoEntity,
} from '@wings-online/product-catalog/entities';
import {
  PromoTypes,
  TypeOrmPromoCMSCriteriaEntity,
} from '@wings-online/product-catalog/promotion';

import { BannerPage, MAX_CACHE_TTL_MS } from '../banner.constants';
import {
  TypeOrmBankMasEntity,
  TypeOrmClusteringCustEntity,
  TypeOrmClusteringFirebaseEntity,
  TypeOrmCustCriteriaEntity,
  TypeOrmSlideCriteriaEntity,
  TypeOrmSlideEntity,
} from '../entities';
import { ISlideReadRepository } from '../interfaces';
import { BannerReadModel } from '../read-models';

type BrandCategory = {
  category_id: number;
  brand_id: number;
};

export class TypeOrmSlideReadRepository
  extends BaseReadRepository
  implements ISlideReadRepository
{
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  private async getBankMasSlide(identity: UserIdentity) {
    const { dry, frozen } = identity.division;

    const bankMas = await this.dataSource
      .createQueryBuilder(TypeOrmSlideCriteriaEntity, 'slide')
      .innerJoin(
        TypeOrmBankMasEntity,
        'bmas',
        'bmas.slsOffice IN (:...slsOffices) AND bmas.isActive = true',
        {
          slsOffices: [dry?.salesOffice, frozen?.salesOffice].filter(Boolean),
        },
      )
      .innerJoin(
        TypeOrmCustCriteriaEntity,
        'customer',
        'customer.buyerExternalId = :externalId AND (customer.isActiveLoan = true OR customer.isActiveLakupandai = true)',
        { externalId: identity.externalId },
      )
      .where('slide.isDelete = false')
      .andWhere('slide.isShown = true')
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            'customer.isActiveLoan = true AND slide.category = :loanCategory',
            { loanCategory: 'pinjaman' },
          ).orWhere(
            'customer.isActiveLakupandai = true AND slide.category = :lakupandaiCategory',
            { lakupandaiCategory: 'lakupandai' },
          );
        }),
      )
      .select([
        'slide.id as id',
        'slide.image as image',
        'slide.seq as sequence',
      ])
      .distinctOn(['slide.image'])
      .cache(
        CacheUtil.getCacheKey(`user:${identity.externalId}:slides:bank-mas`),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      )
      .getRawMany<{
        id: string;
        name: string;
        image: string;
        sequence: number;
      }>();

    return bankMas.map(
      (slide) =>
        new BannerReadModel({
          id: EntityId.fromNumber(Number(slide.id)),
          name: 'Bank Mas',
          image: slide.image,
          page: '',
          productId: null,
          productExternalId: null,
          brandId: null,
          categoryId: null,
          categoryName: null,
          brandName: null,
          categoryIcon: null,
          categoryImage: null,
          flashSaleId: null,
          regularPromoId: null,
          type: 'DRY',
          sequence: slide.sequence || 1,
        }),
    );
  }

  async listSliders(
    identity: UserIdentity,
  ): Promise<PaginatedCollection<BannerReadModel>> {
    const [bankMasSlides, slides] = await Promise.all([
      this.getBankMasSlide(identity),
      this.listSlides(identity),
    ]);

    const data = [...bankMasSlides, ...this.sortSlide(slides)];

    return {
      data,
      metadata: {
        page: 1,
        pageSize: data.length,
        totalCount: data.length,
      },
    };
  }

  private getClusteringCustQuery(identity: UserIdentity) {
    return this.dataSource
      .createQueryBuilder(TypeOrmClusteringCustEntity, 'clustering')
      .select('clusteringFirebase.idMessage', 'id')
      .innerJoin('clustering.clusteringFirebase', 'clusteringFirebase')
      .where('clustering.custId = :custId', { custId: identity.externalId });
  }

  private getClusteringFirebaseQuery(identity: UserIdentity, feature: string) {
    const { dry, frozen } = identity.division;
    return this.dataSource
      .createQueryBuilder(TypeOrmClusteringFirebaseEntity, 'clustering')
      .select('clustering.idMessage', 'id')
      .where(
        new Brackets((qb) => {
          if (dry) {
            qb.orWhere(
              '(clustering.slsOffice = :drySalesOffice AND clustering.custGroup = :dryGroup)',
              {
                drySalesOffice: dry.salesOffice,
                dryGroup: dry.group,
              },
            );
          }
          if (frozen) {
            qb.orWhere(
              '(clustering.slsOffice = :frozenSalesOffice AND clustering.custGroup = :frozenGroup)',
              {
                frozenSalesOffice: frozen.salesOffice,
                frozenGroup: frozen.group,
              },
            );
          }
        }),
      )
      .andWhere('clustering.feature = :feature', { feature });
  }

  async listSlides(identity: UserIdentity): Promise<BannerReadModel[]> {
    const { dry, frozen } = identity.division;

    const itemField =
      identity.organization === OrganizationEnum.WS
        ? 'm_material_ws_id'
        : 'm_material_id';

    const promoConditions: string[] = [];
    if (dry) {
      promoConditions.push(
        '(target.salesOffice = :drySalesOffice AND target.group = :dryGroup)',
      );
    }

    if (frozen) {
      promoConditions.push(
        '(target.salesOffice = :frozenSalesOffice AND target.group = :frozenGroup)',
      );
    }

    const query = this.dataSource
      .createQueryBuilder(TypeOrmSlideEntity, 'slide')
      .select(['slide.id', 'slide.page', 'slide.image', 'slide.seq'])
      .addSelect(['item.id', 'item.externalId', 'item.isActive'])
      .addSelect(['info.name', 'info.type', 'info.categoryId', 'info.brandId'])
      .addSelect([
        'categoryInfo.name',
        'categoryInfo.image',
        'categoryInfo.icon',
      ])
      .addSelect(['prices.itemId'])
      .addSelect(['exclusions.itemId'])
      .addSelect(['salesConfigs.itemId'])
      .addSelect(['promo.type'])
      .addCommonTableExpression(
        [
          this.getClusteringCustQuery(identity).getQuery(),
          this.getClusteringFirebaseQuery(identity, 'slide').getQuery(),
        ].join(' UNION '),
        'clustering',
      )
      .setParameters({
        ...this.getClusteringCustQuery(identity).getParameters(),
        ...this.getClusteringFirebaseQuery(identity, 'slide').getParameters(),
      })
      .innerJoinAndMapOne(
        'slide.item',
        TypeOrmItemEntity,
        'item',
        `slide.${itemField} = item.externalId AND item.entity = :entity`,
        { entity: identity.organization },
      )
      .innerJoin('item.info', 'info')
      .leftJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
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
      .leftJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoinAndMapOne(
        'info.category',
        TypeOrmCategoryEntity,
        'category',
        'info.categoryId = category.id',
      )
      .leftJoin('category.info', 'categoryInfo')
      .leftJoinAndMapOne(
        'info.brand',
        TypeOrmBrandEntity,
        'brand',
        'info.brandId = brand.id',
      )
      .leftJoinAndMapMany(
        'item.promoCMSCriteria',
        TypeOrmPromoCMSCriteriaEntity,
        'criteria',
        'item.id::varchar = criteria.itemId OR criteria.tag = ANY(salesConfigs.tags)',
      )
      .leftJoin(
        'criteria.promo',
        'promo',
        'promo.organization in (:...orgIds)',
        {
          orgIds: ['*', identity.organization],
        },
      )
      .leftJoin('promo.targets', 'target', promoConditions.join(' OR '))
      .where('slide.isDelete = false')
      .andWhere('slide.isShown = true')
      .andWhere('slide.shownAt IN (:...shownAt)', {
        shownAt: BannerUtil.getBannerShownKeys(identity),
      })
      .andWhere('slide.id IN (select id from clustering)');

    const isRetailS = SalesUtil.isRetailS(identity);
    if (isRetailS) {
      query.leftJoin(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
      query.addSelect(['retailConfigs.itemId']);
    }

    const dryOnly = dry && !frozen;
    const frozenOnly = !dry && frozen;
    if (dryOnly || frozenOnly) {
      query.andWhere('info.type = :type', {
        type: dryOnly ? ProductType.DRY : ProductType.FROZEN,
      });
    }

    if (dry) {
      query.setParameters({
        drySalesOffice: dry.salesOffice,
        dryGroup: dry.group,
      });
    }

    if (frozen) {
      query.setParameters({
        frozenSalesOffice: frozen.salesOffice,
        frozenGroup: frozen.group,
      });
    }
    const slides = await query
      .cache(
        CacheUtil.getCacheKey(`user:${identity.externalId}:slides`),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      )
      .getMany();

    const categoryIds = slides
      .filter(
        (slide) =>
          (BannerPage.CATEGORY && slide.item.info.categoryId) ||
          (BannerPage.BRAND &&
            slide.item.info.categoryId &&
            slide.item.info.brandId),
      )
      .map((slides) => slides.item.info.categoryId) as number[];

    let categories: Array<BrandCategory> = [];
    if (categoryIds.length > 0) {
      categories = await this.checkExistsProductsByCategoryIds(
        identity,
        categoryIds,
      );
    }

    return slides
      .map((slide) => {
        if (!this.isValidSlide(slide, categories, isRetailS)) return null;

        let page = slide.page;
        let missionId: Nullable<number> = null;

        if (
          slide.page.includes(BannerPage.MISSION_DISPLAY) ||
          slide.page.includes(BannerPage.MISSION_SURVEY) ||
          slide.page.includes(BannerPage.MISSION_PURCHASE)
        ) {
          const splitted = slide.page.split(' ');
          page = splitted[0] + ' ' + splitted[1];
          missionId = Number(splitted[2]);
        }

        const flashSaleId = this.getPromoId(
          slide.item.promoCMSCriteria || [],
          PromoTypes.FlashSale,
        );
        const regularPromoId = this.getPromoId(
          slide.item.promoCMSCriteria || [],
          PromoTypes.Regular,
        );

        return new BannerReadModel({
          id: EntityId.fromNumber(Number(slide.id)),
          name: slide.item.info.name || '',
          image: slide.image,
          page: page,
          missionId,
          productId: slide.item ? EntityId.fromString(slide.item.id) : null,
          productExternalId: slide.item?.externalId || null,
          brandId: slide.item.info.brandId || null,
          brandName: slide.item.info.brand?.description || null,
          categoryId: slide.item.info.categoryId || null,
          categoryName: slide.item.info.category?.info.name || null,
          categoryIcon: slide.item.info.category?.info.icon || null,
          categoryImage: slide.item.info.category?.info.image || null,
          type: slide.item.info.type,
          sequence: slide.seq,
          flashSaleId,
          regularPromoId,
        });
      })
      .filter(Boolean) as BannerReadModel[];
  }

  private async checkExistsProductsByCategoryIds(
    identity: UserIdentity,
    categoryIds: Array<number>,
  ): Promise<Array<BrandCategory>> {
    if (!categoryIds.length) return [];
    const { dry, frozen } = identity.division;

    const query = this.dataSource
      .createQueryBuilder(TypeOrmItemInfoEntity, 'item_info')
      .innerJoin('item_info.item', 'item')
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .innerJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .innerJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...configKeys)',
        {
          configKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      );

    const dryOnly = dry && !frozen;
    const frozenOnly = !dry && frozen;
    if (dryOnly || frozenOnly) {
      query.andWhere('item_info.type = :type', {
        type: dryOnly ? ProductType.DRY : ProductType.FROZEN,
      });
    }

    if (SalesUtil.isRetailS(identity)) {
      query.innerJoin(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
    }

    return await query
      .andWhere('exclusions.itemId IS NULL')
      .andWhere('item.isActive = true')
      .andWhere('item.entity = :entity', { entity: identity.organization })
      .andWhere('item_info.categoryId IN (:...categoryIds)', { categoryIds })
      .select([
        'item_info.categoryId as category_id',
        'item_info.brandId as brand_id',
      ])
      .groupBy('item_info.categoryId')
      .addGroupBy('item_info.brandId')
      .cache(
        CacheUtil.getCacheKey(`user:${identity.externalId}:slides:categories`),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      )
      .getRawMany<BrandCategory>();
  }

  private isValidSlide(
    slide: TypeOrmSlideEntity,
    categories: BrandCategory[],
    isRetailS: boolean,
  ): boolean {
    const { page, item } = slide;

    switch (page) {
      case BannerPage.PRODUCT_DETAIL:
        return (
          item.isActive &&
          !!item.prices?.length &&
          !item.exclusions?.length &&
          !!item.salesConfigs?.length &&
          (!isRetailS || !!item.retailConfigs?.length)
        );

      case BannerPage.CATEGORY:
        return !!categories.find((c) => c.category_id === item.info.categoryId);

      case BannerPage.BRAND:
        return !!categories.find(
          (c) =>
            c.category_id === item.info.categoryId &&
            c.brand_id === item.info.brandId,
        );

      default:
        return true;
    }
  }

  private getPromoId(
    promoCriteria: TypeOrmPromoCMSCriteriaEntity[],
    promoType: PromoTypes,
  ): Nullable<string> {
    const promo = promoCriteria.find(
      (c) => c.promo?.targets?.length && c.promo?.type === promoType,
    );
    return promo?.promo.externalId || null;
  }

  private sortSlide(slides: BannerReadModel[]): BannerReadModel[] {
    const dryItems = slides
      .filter((d) => d.type === 'DRY')
      .sort((a, b) => a.sequence - b.sequence);
    const frozenItems = slides
      .filter((d) => d.type === 'FROZEN')
      .sort((a, b) => a.sequence - b.sequence);

    const result: BannerReadModel[] = [];
    const maxLength = Math.max(dryItems.length, frozenItems.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < dryItems.length) result.push(dryItems[i]);
      if (i < frozenItems.length) result.push(frozenItems[i]);
    }

    return result;
  }
}
