import { DateTime } from 'luxon';
import { DataSource, SelectQueryBuilder } from 'typeorm';

import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  Collection,
  Nullable,
  PaginatedCollection,
} from '@wings-corporation/core';
import { EntityId } from '@wings-corporation/domain';
import {
  FEATURE_FLAG_SERVICE,
  FeatureFlagService,
} from '@wings-corporation/nest-feature-flag';
import { KeyUtil } from '@wings-corporation/utils';
import { FeatureFlagNameEnum } from '@wings-online/app.constants';
import {
  BaseReadModelMapper,
  BaseReadRepository,
  CacheUtil,
  DivisionInfo,
  PaginationUtil,
  UserIdentity,
} from '@wings-online/common';
import { ParameterService } from '@wings-online/parameter/parameter.service';
import {
  PRODUCT_HELPER_REPOSITORY,
  ProductType,
} from '@wings-online/product-catalog';
import {
  TypeOrmBestSellerEntity,
  TypeOrmCustItemHistoryEntity,
  TypeOrmItemEntity,
  TypeOrmRecommendationCsEntity,
  TypeOrmRecommendationSimilarEntity,
  TypeOrmRecommendationUsEntity,
} from '@wings-online/product-catalog/entities';
import { IProductHelperRepository } from '@wings-online/product-catalog/interfaces';
import { ProductMapper } from '@wings-online/product-catalog/mappers';
import { ProductReadModel } from '@wings-online/product-catalog/read-models';

import { TypeOrmWishlistEntity, TypeOrmWishlistItemEntity } from '../entities';
import {
  GetWishlistItemsParams,
  GetWishlistsParams,
  IWishlistReadRepository,
} from '../interfaces';
import { WishlistReadModel } from '../read-models';
import { MAX_CACHE_TTL_MS } from '../wishlist.constants';

type GetWishlistsCursor = {
  updatedAt: Date;
};

export class TypeOrmWishlistReadRepository
  extends BaseReadRepository
  implements IWishlistReadRepository
{
  private readonly productMapper: BaseReadModelMapper<
    TypeOrmItemEntity,
    ProductReadModel
  >;
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(PRODUCT_HELPER_REPOSITORY)
    private readonly helperRepository: IProductHelperRepository,
    private readonly parameterService: ParameterService,
    @Inject(FEATURE_FLAG_SERVICE)
    private readonly featureFlagService: FeatureFlagService,
  ) {
    super();
    this.productMapper = new ProductMapper(this.parameterService);
  }

  private async useCache(): Promise<boolean> {
    const isApiCacheEnabled = await this.featureFlagService.isEnabled(
      FeatureFlagNameEnum.EnableAPICache,
    );
    return !isApiCacheEnabled;
  }

  private getBaseQuery(
    identity: UserIdentity,
  ): SelectQueryBuilder<TypeOrmWishlistEntity> {
    const { dry, frozen } = identity.division;

    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmWishlistEntity, 'wishlist')
      .leftJoin('wishlist.items', 'items')
      .leftJoin(
        'items.item',
        'item',
        'item.isActive = true AND item.entity = :entity',
        {
          entity: identity.organization,
        },
      )
      .leftJoin('item.info', 'info')
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        { excludeKeys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .leftJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      );

    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    if (isRetailS) {
      queryBuilder.leftJoin(
        'item.retailConfigs',
        'retailConfigs',
        '(retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now())',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
    }

    return queryBuilder;
  }

  private getProductType(division: DivisionInfo): Nullable<string> {
    const { dry, frozen } = division;

    if (dry && !frozen) {
      return ProductType.DRY;
    } else if (!dry && frozen) {
      return ProductType.FROZEN;
    } else {
      return null;
    }
  }

  async getWishlists(
    params: GetWishlistsParams,
  ): Promise<Collection<WishlistReadModel>> {
    const { limit, cursor, identity } = params;
    const { dry, frozen } = identity.division;
    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    const type = this.getProductType(identity.division);
    const query = this.getBaseQuery(identity)
      .andWhere('wishlist.buyerId = :buyerId', {
        buyerId: identity.id,
      })
      .select([
        'wishlist.id',
        'wishlist.name',
        'wishlist.updatedAt',
        'wishlist.isDefault',
      ])
      .addSelect('items')
      .addSelect(['item.id'])
      .addSelect(['prices.itemId'])
      .addSelect(['exclusions.itemId'])
      .addSelect(['salesConfigs.itemId'])
      .addSelect(['info.itemId', 'info.imageUrl', 'info.type'])
      .addOrderBy('wishlist.isDefault', 'DESC')
      .addOrderBy('wishlist.updatedAt', 'DESC')
      .take(limit + 1);

    if (isRetailS) {
      query.addSelect('retailConfigs');
    }

    if (cursor) {
      const value = this.decodeCursor<GetWishlistsCursor>(cursor);
      if (value) {
        query.andWhere('wishlist.updatedAt <= :updatedAt', {
          updatedAt: value.updatedAt,
        });
      }
    }

    const useCache = await this.useCache();

    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:wishlists:${CacheUtil.encode(params)}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const items = await query.getMany();
    const lastItem =
      items.length === params.limit + 1 ? items.pop() : undefined;

    return {
      data: items.map((item: TypeOrmWishlistEntity) => {
        let items = item.items.filter(
          (item) =>
            item.item &&
            item.item.info &&
            item.item.prices.length &&
            !item.item.exclusions.length &&
            item.item.salesConfigs.length,
        );

        if (
          identity.division.dry?.isRetailS &&
          identity.division.frozen?.isRetailS
        ) {
          items = items.filter((item) => item.item.retailConfigs?.length);
        } else if (identity.division.dry?.isRetailS) {
          items = items.filter(
            (item) =>
              item.item.info.type === 'FROZEN' ||
              item.item.retailConfigs?.length,
          );
        } else if (identity.division.frozen?.isRetailS) {
          items = items.filter(
            (item) =>
              item.item.info.type === 'DRY' || item.item.retailConfigs?.length,
          );
        }

        items = items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        if (type) {
          items = items.filter((item) => item.item.info.type === type);
        }

        if (isRetailS) {
          items = items.filter((item) => item.item.retailConfigs);
        }

        (item.items as any) = items;

        return this.toReadModel(item);
      }),
      metadata: {
        nextCursor: lastItem
          ? this.encodeCursor({
              updatedAt: DateTime.fromJSDate(new Date(lastItem.updatedAt))
                .plus({ milliseconds: 1 })
                .toISO(),
            })
          : undefined,
      },
    };
  }

  async getWishlistItems(
    params: GetWishlistItemsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, id } = params;
    const { dry, frozen } = identity.division;

    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const query = this.dataSource
      .createQueryBuilder(TypeOrmWishlistItemEntity, 'items')
      .innerJoin('items.item', 'item')
      .innerJoin('item.info', 'info')
      .leftJoin('info.brand', 'brand')
      .leftJoin('item.cartItems', 'cartItems')
      .leftJoin('cartItems.cart', 'cart', 'cart.buyerId = :buyerId')
      .andWhere('item.entity = :entity', { entity: identity.organization })
      .andWhere('item.isActive = true')
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        { excludeKeys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .andWhere('exclusions.itemId IS NULL')
      .innerJoinAndSelect(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.salesFactors',
        'salesFactors',
        'salesFactors.key in (:...factorKeys) AND salesFactors.validFrom <= now() AND salesFactors.validTo >= now()',
        {
          factorKeys: KeyUtil.getSalesFactorKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      );

    this.helperRepository
      .joinPromoTPRQuery(query, identity)
      .leftJoinAndMapOne(
        'item.bestSeller',
        TypeOrmBestSellerEntity,
        'bestSeller',
        `(item.externalId)::varchar = bestSeller.material_id`,
      )
      .leftJoinAndMapOne(
        'item.recommendationCs',
        TypeOrmRecommendationCsEntity,
        'recommendationCs',
        '(item.externalId)::varchar = recommendationCs.externalId AND recommendationCs.buyerExternalId = :externalId',
      )
      .leftJoinAndMapOne(
        'item.recommendationUs',
        TypeOrmRecommendationUsEntity,
        'recommendationUs',
        '(item.externalId)::varchar = recommendationUs.externalId AND recommendationUs.buyerExternalId = :externalId',
      )
      .leftJoinAndMapOne(
        'item.recommendationSimilar',
        TypeOrmRecommendationSimilarEntity,
        'recommendationSimilar',
        '(item.externalId)::varchar = recommendationSimilar.externalId AND recommendationSimilar.buyerExternalId = :externalId',
      )
      .leftJoinAndMapOne(
        'item.custItemHistory',
        TypeOrmCustItemHistoryEntity,
        'custItemHistory',
        "(item.externalId)::varchar = custItemHistory.externalId AND custItemHistory.flagRedline = 'Y' AND custItemHistory.buyerExternalId = :externalId",
      )
      .setParameters({ externalId: identity.externalId, buyerId: identity.id });

    const type = this.getProductType(identity.division);
    if (type) {
      query.andWhere('info.type = :productType', {
        productType: type,
      });
    }

    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    if (isRetailS) {
      query.leftJoin(
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
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        query.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'DRY')`,
        );
      }
    }

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:wishlists:items:${CacheUtil.encode(
            params,
          )}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query
      .addSelect([
        'item.id',
        'item.baseUom',
        'item.packUom',
        'item.packQty',
        'item.externalId',
        'info.name',
        'info.type',
        'info.description',
        'info.imageUrl',
        'info.brandId',
        'bestSeller.id',
        'recommendationCs.id',
        'recommendationUs.id',
        'recommendationSimilar.id',
        'custItemHistory.id',
        'cartItems.id',
        'cartItems.qty',
        'cartItems.createdAt',
        'cart.id',
        'brand.id',
        'brand.description',
      ])
      .andWhere('items.wishlistId = :wishlistId', { wishlistId: id.value })
      .addOrderBy('items.createdAt', 'DESC')
      .take(pageSize)
      .skip(offset)
      .getManyAndCount();

    return {
      data: items.map((item) => this.productMapper.toReadModel(item.item)),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  private toReadModel(entity: TypeOrmWishlistEntity): WishlistReadModel {
    const images = entity.items.map((item) => item.item.info.imageUrl);

    return new WishlistReadModel({
      id: EntityId.fromString(entity.id),
      name: entity.name,
      images: images.length > 8 ? images.slice(0, 7) : images.slice(0, 8),
      totalItems: entity.items.length,
      isDefault: entity.isDefault,
    });
  }
}
