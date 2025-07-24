import { uniq } from 'lodash';
import { DateTime } from 'luxon';
import ms from 'ms';
import { Brackets, DataSource } from 'typeorm';

import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Collection, DivisionEnum } from '@wings-corporation/core';
import {
  EntityId,
  Money,
  Percentage,
  Quantity,
} from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import {
  BUYER_READ_REPOSITORY,
  TAG_KEY_MATERIAL_GROUP_2,
  UomTypeEnum,
} from '@wings-online/app.constants';
import { PackQty, Tag } from '@wings-online/cart/domains';
import {
  TypeOrmBrandEntity,
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmCartTagEntity,
  TypeOrmCartVoucherEntity,
  TypeOrmFreezerEntity,
  TypeOrmItemEntity,
} from '@wings-online/cart/entities';
import {
  CartItemReadModel,
  CartReadModel,
  DeliveryAddressReadModel,
  ItemReadModel,
} from '@wings-online/cart/read-models';
import {
  VoucherDiscountType,
  VoucherRedemptionStatus,
} from '@wings-online/cart/voucher/interfaces';
import {
  BaseReadModelMapper,
  BaseReadRepository,
  CacheUtil,
  DiscountBenefit,
  ISalesUom,
  IdentityUtil,
  PurchaseQtyByTag,
  SalesTier,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';
import { ParameterUtils } from '@wings-online/parameter/parameter.utils';
import { ProductLabel } from '@wings-online/product-catalog';
import { TypeOrmItemSalesUomEntity } from '@wings-online/product-catalog/entities';

import {
  CartType,
  ItemType,
  MINIMUM_FREEZER_TEMPERATURE,
} from '../cart.constants';
import {
  CartVoucher,
  GetCartItemsParams,
  IBuyerReadRepository,
  ICartReadRepository,
} from '../interfaces';
import { CartQtyReadModel } from '../read-models/cart-qty.read-model';

type CartItemRawResult = {
  id: string;
  items_id: string;
  items_cart_id: string;
  items_item_id: number;
  items_qty: number;
  items_qty_intermediate: number;
  items_qty_pack: number;
  items_sales_factor: number;
  items_created_at: Date;
  items_is_base_sellable: boolean;
  items_is_pack_sellable: boolean;
  item_id: string;
  item_base_uom: string;
  item_pack_uom: string;
  item_pack_qty: number;
  item_external_id: string;
  item_is_active: boolean;
  info_type: ItemType;
  info_name: string;
  info_description: string;
  info_image_url: string;
  info_brand_id: number;
  price_cart_item_id: string;
  price_price: number;
  salesConfigs_tags?: string[];
  uoms_uom: string;
  uoms_pack_qty: number;
  //label fields
  recommendation: boolean;
  best_seller: boolean;
  low_stock: boolean;
};

type GetCartItemsCursor = {
  id: string;
  createdAt: Date;
};

class CartItemMapper extends BaseReadModelMapper<
  CartItemRawResult,
  CartItemReadModel
> {
  toReadModel(data: CartItemRawResult): CartItemReadModel {
    const labels: ProductLabel[] = [];

    let baseUoM = data.item_base_uom;
    let baseQty = 1;
    if (data.uoms_uom && data.uoms_pack_qty) {
      baseUoM = data.uoms_uom;
      baseQty = data.uoms_pack_qty;
    }

    if (data.recommendation) {
      labels.push(ProductLabel.RECOMMENDED);
    }
    if (data.best_seller) {
      labels.push(ProductLabel.BEST_SELLER);
    }
    if (data.low_stock) {
      labels.push(ProductLabel.LOW_STOCK);
    }

    const model = new CartItemReadModel({
      id: data.id,
      item: new ItemReadModel({
        id: data.item_id,
        externalId: data.item_external_id,
        name: data.info_name,
        imageUrl: data.info_image_url,
        baseQty: baseQty,
        packQty: data.item_pack_qty || 1,
        totalQty: data.items_qty,
        uom: {
          base: data.item_base_uom,
          intermediate: data.item_base_uom === baseUoM ? undefined : baseUoM,
          pack: data.item_pack_uom,
        },
        baseUoM: baseUoM,
        packUoM: data.item_pack_uom,
        salesFactor: data.items_sales_factor,
        tags: data.salesConfigs_tags || [],
        labels: labels,
        isBaseSellable: data.items_is_base_sellable,
        isPackSellable: data.items_is_pack_sellable,
      }),
      qty: data.items_qty,
      qtyIntermediate: data.items_qty_intermediate,
      qtyPack: data.items_qty_pack,
      price: data.price_price,
      addedAt: data.items_created_at,
    });
    return model;
  }
}

export class TypeOrmCartReadRepository
  extends BaseReadRepository
  implements ICartReadRepository
{
  private readonly cartItemMapper: BaseReadModelMapper<any, CartItemReadModel>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(BUYER_READ_REPOSITORY)
    private readonly buyerRepository: IBuyerReadRepository,
    protected readonly parameterService: ParameterService,
  ) {
    super();
    this.cartItemMapper = new CartItemMapper();
  }

  async getCartInfo(
    identity: UserIdentity,
    type: CartType,
  ): Promise<CartReadModel | undefined> {
    const cartEntity = await this.dataSource
      .createQueryBuilder(TypeOrmCartEntity, 'cart')
      .leftJoinAndSelect('cart.deliveryAddress', 'deliveryAddress')
      .leftJoinAndSelect('cart.tags', 'tags')
      .where('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('cart.type = :type', { type })
      .getOne();

    if (!cartEntity) return undefined;

    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmCartItemEntity, 'items')
      .innerJoinAndSelect('items.item', 'item')
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...configKeys)',
        {
          configKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .innerJoinAndSelect('item.info', 'info')
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        },
      );

    const entities = await queryBuilder
      .innerJoinAndSelect('items.price', 'price')
      .andWhere('items.cartId = :cartId', { cartId: cartEntity.id })
      .addOrderBy('items.createdAt', 'DESC')
      .getMany();

    const cart = new CartReadModel({
      id: cartEntity.id,
      deliveryAddress:
        (await this.resolveCartDeliveryAddress(cartEntity, identity)) || null,
      tags: cartEntity.tags.map((x) => ({
        tag: Tag.fromString(x.tag),
        qty: Quantity.create(x.qty),
        amount: Money.create(0),
        uomType: UomTypeEnum.BASE,
        items: entities
          .filter((f) => {
            const salesConfig = SalesUtil.getEffectiveSalesConfig(
              f.item.salesConfigs.map((config) =>
                SalesUtil.mapToSalesItemConfig(config),
              ),
            );
            return salesConfig
              ? salesConfig.tags.some((t) => t.equals(Tag.fromString(x.tag)))
              : false;
          })
          .map((i) => ({
            itemId: i.itemId,
            qty: Quantity.create(i.qty),
            qtyIntermediate: Quantity.create(i.qtyIntermediate),
            qtyPack: Quantity.create(i.qtyPack),
            addedAt: i.createdAt,
          })),
      })),
      updatedAt: cartEntity.updatedAt,
    });

    for (const entity of entities) {
      const uoms: ISalesUom[] = entity.item.uoms.map((x) => ({
        tier: SalesTier.create(x.tier),
        name: x.uom,
        qty: PackQty.create(x.packQty),
      }));
      const baseUom = SalesUtil.getEffectiveBaseUom(entity.item.baseUom, uoms);
      const item = new CartItemReadModel({
        id: entity.id,
        item: new ItemReadModel({
          id: entity.itemId,
          externalId: entity.item.externalId,
          name: entity.item.info.name || null,
          imageUrl: entity.item.info.imageUrl || null,
          baseQty: baseUom.qty.value,
          packQty: entity.item.packQty,
          totalQty: entity.qty,
          uom: {
            base: entity.item.baseUom,
            intermediate:
              baseUom.name === entity.item.baseUom
                ? undefined
                : entity.item.baseUom,
            pack: entity.item.packUom,
          },
          baseUoM: baseUom.name,
          packUoM: entity.item.packUom || null,
          salesFactor: entity.salesFactor,
          tags: entity.item.salesConfigs[0]?.tags || [],
          labels: [],
          isBaseSellable: entity.isBaseSellable,
          isPackSellable: entity.isPackSellable,
        }),
        qty: entity.qty,
        qtyIntermediate: entity.qtyIntermediate,
        qtyPack: entity.qtyPack,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        price: entity.price!.price,
        addedAt: entity.createdAt,
      });

      cart.addItem(item);
    }

    return cart;
  }

  async getCartItems(
    params: GetCartItemsParams,
  ): Promise<Collection<CartItemReadModel>> {
    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmCartItemEntity, 'items')
      .innerJoin('items.cart', 'cart')
      .innerJoinAndSelect('items.item', 'item')
      .innerJoinAndSelect('item.info', 'info')
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...configKeys)',
        {
          configKeys: KeyUtil.getSalesConfigKeys(params.identity),
        },
      )
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(params.identity),
        },
      )
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('uoms.tier')
          .from(TypeOrmItemSalesUomEntity, 'uoms')
          .where('uoms.itemId = item.id')
          .andWhere('uoms.slsOffice in (:...slsOffice)', {
            slsOffice: KeyUtil.getSalesUomKeys(params.identity),
          })
          .orderBy('uoms.tier', 'DESC')
          .limit(1)
          .getQuery();
        return `(uoms.tier = ${subQuery} OR uoms.itemId IS NULL)`;
      });

    if (params.cursor) {
      const value = this.decodeCursor<GetCartItemsCursor>(params.cursor);
      if (value) {
        queryBuilder.andWhere(
          new Brackets((sub) => {
            sub.andWhere('items.createdAt <= :createdAt', {
              createdAt: value.createdAt,
            });
          }),
        );
      }
    }

    if (params.limit) {
      queryBuilder.limit(params.limit + 1);
    }

    const items = await queryBuilder
      .innerJoinAndSelect('items.price', 'price')
      .andWhere('cart.buyerId = :buyerId', { buyerId: params.identity.id })
      .andWhere('cart.type = :type', { type: params.type })
      .addOrderBy('items.createdAt', 'DESC')
      .getRawMany<CartItemRawResult>();

    const lastItem = params.limit
      ? items.length === params.limit + 1
        ? items.pop()
        : undefined
      : undefined;

    const data = items.map((item) => this.cartItemMapper.toReadModel(item));

    return {
      data,
      metadata: {
        nextCursor: lastItem
          ? this.encodeCursor({
              // see https://stackoverflow.com/questions/61025005/equal-to-operation-not-working-with-timestamp-column-postgresql
              createdAt: DateTime.fromJSDate(lastItem.items_created_at)
                .plus({ millisecond: 1 })
                .toISO(),
            })
          : undefined,
      },
    };
  }

  async getCartPurchaseTags(
    identity: UserIdentity,
  ): Promise<PurchaseQtyByTag[]> {
    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmCartTagEntity, 'tags')
      .innerJoin('tags.cart', 'cart')
      .where('cart.buyerId = :buyerId', { buyerId: identity.id })
      .getMany();

    return entities.map((x) => ({
      tag: Tag.fromString(x.tag),
      qty: Quantity.create(x.qty),
      uomType: UomTypeEnum.BASE,
      items: [],
    }));
  }

  async getCartVouchers(
    identity: UserIdentity,
    cartType: CartType,
  ): Promise<CartVoucher[]> {
    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmCartVoucherEntity, 'vouchers')
      .innerJoin(
        'vouchers.cart',
        'cart',
        'cart.buyerId = :buyerId AND cart.type = :cartType',
        {
          buyerId: identity.id,
          cartType,
        },
      )
      .innerJoinAndSelect('vouchers.voucher', 'voucher')
      .innerJoin(
        'voucher.redemptions',
        'redemption',
        'redemption.status = :redemptionStatus AND redemption.custId = :externalId AND redemption.expiredDate >= DATE(now())',
        {
          redemptionStatus: VoucherRedemptionStatus.NOT_USED,
          externalId: identity.externalId,
        },
      )
      .innerJoinAndSelect(
        'voucher.customer',
        'customer',
        `customer.cust_id = :externalId OR (customer.sls_office IN (:...slsOffice) AND customer.cust_group IN (:...custGroup) AND customer.cust_id = '')`,
        {
          slsOffice: [
            identity.division.dry?.salesOffice,
            identity.division.frozen?.salesOffice,
          ].filter(Boolean),
          custGroup: [
            identity.division.dry?.group,
            identity.division.frozen?.group,
          ].filter(Boolean),
        },
      )
      .leftJoinAndSelect('customer.material', 'material')
      .leftJoinAndMapOne(
        'material.item',
        TypeOrmItemEntity,
        'item',
        'material.materialId = (item.externalId)::varchar AND item.entity = :entity',
        { entity: identity.organization },
      )
      .leftJoin('item.info', 'info')
      .addSelect(['info.name', 'info.imageUrl'])
      .getMany();

    const vouchers: CartVoucher[] = [];
    for (const entity of entities) {
      vouchers.push(await this.toCartVoucher(entity));
    }
    return vouchers;
  }

  async getCartTagsByTags(
    identity: UserIdentity,
    tags: string[],
  ): Promise<PurchaseQtyByTag[]> {
    if (tags.length === 0) return [];

    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmCartTagEntity, 'tags')
      .innerJoinAndSelect('tags.cart', 'cart')
      .innerJoinAndSelect('cart.items', 'cartItems')
      .leftJoinAndSelect('cartItems.item', 'item')
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .where('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('tags.tag IN (:...tags)', { tags })
      .getMany();

    return entities.map((entity) => ({
      tag: Tag.fromString(entity.tag),
      qty: Quantity.create(entity.qty),
      // TODO: optimize filter cart items by tag
      items: entity.cart.items
        .filter((f) => {
          const salesConfig = SalesUtil.getEffectiveSalesConfig(
            f.item.salesConfigs.map((config) =>
              SalesUtil.mapToSalesItemConfig(config),
            ),
          );
          return (
            f.qty !== 0 &&
            (salesConfig
              ? salesConfig.tags.some((t) =>
                  t.equals(Tag.fromString(entity.tag)),
                )
              : false)
          );
        })
        .map((i) => ({
          itemId: i.itemId,
          qty: Quantity.create(i.qty),
          qtyIntermediate: Quantity.create(i.qtyIntermediate),
          qtyPack: Quantity.create(i.qtyPack),
          addedAt: i.createdAt,
        })),
    }));
  }

  async isFreezerQualified(identity: UserIdentity): Promise<boolean> {
    const freezer = await this.dataSource
      .createQueryBuilder(TypeOrmFreezerEntity, 'freezer')
      .where('freezer.externalId = :externalId', {
        externalId: identity.externalId,
      })
      .orderBy('freezer.visitDate', 'DESC')
      .cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:freezer-qualification:latest`,
        ),
        ms('1h'),
      )
      .getOne();

    return freezer ? freezer.temperature <= MINIMUM_FREEZER_TEMPERATURE : false;
  }

  async getCartMinimumPurchase(
    identity: UserIdentity,
    type: CartType,
  ): Promise<Money> {
    let minOrder: number | undefined;

    const valuePrefix = `${identity.organization}-${type}`;

    const parameters = this.parameterService.get(
      ParameterKeys.MINIMUM_ORDER_CUSTOMER_GROUP,
    );

    if (parameters) {
      minOrder = Number(
        ParameterUtils.getParameterByValuePrefix(
          parameters,
          type === DivisionEnum.DRY
            ? `${valuePrefix}-${identity.division.dry!.group}-`
            : `${valuePrefix}-${identity.division.frozen!.group}-`,
        )
          ?.value.split('-')
          .pop(),
      );
    }

    if (!minOrder) {
      const defaultParameters = this.parameterService.get(
        ParameterKeys.MINIMUM_ORDER_DEFAULT,
      );

      if (defaultParameters) {
        minOrder = Number(
          ParameterUtils.getParameterByValuePrefix(
            defaultParameters,
            type === DivisionEnum.DRY ? `${valuePrefix}-` : `${valuePrefix}-`,
          )
            ?.value.split('-')
            .pop(),
        );
      } else {
        minOrder = 0;
      }
    }

    return minOrder ? Money.create(minOrder) : Money.zero();
  }

  async getCartQtyByItems(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<CartQtyReadModel> {
    const cartQty = new CartQtyReadModel();

    if (itemIds.length === 0) return cartQty;

    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmCartItemEntity, 'items')
      .innerJoin('items.cart', 'cart')
      .where('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('items.itemId IN (:...itemIds)', { itemIds: uniq(itemIds) })
      .getMany();

    for (const entity of entities) {
      cartQty.addQtyByItem({
        itemId: entity.itemId,
        qty: Quantity.create(entity.qty),
        qtyIntermediate: Quantity.create(entity.qtyIntermediate),
        qtyPack: Quantity.create(entity.qtyPack),
        addedAt: entity.createdAt,
      });
    }

    return cartQty;
  }

  private async getBrandByTag(
    tag: Tag,
  ): Promise<TypeOrmBrandEntity | undefined> {
    const brand = await this.dataSource
      .createQueryBuilder(TypeOrmBrandEntity, 'brand')
      .innerJoin('brand.itemInfo', 'itemInfo')
      .innerJoin('itemInfo.item', 'item')
      .innerJoin(
        'item.salesConfigs',
        'salesConfig',
        ':tag = ANY(salesConfig.tags)',
        { tag: tag.toString() },
      )
      .getOne();

    return brand || undefined;
  }

  private async toCartVoucher(
    entity: TypeOrmCartVoucherEntity,
  ): Promise<CartVoucher> {
    let itemId: string | undefined;
    let targetName: string | undefined;
    let tag: string | undefined;

    const { voucher } = entity;
    const { material } = voucher.customer;

    const id = EntityId.fromString(entity.voucherId);
    const benefit: DiscountBenefit =
      voucher.discountType === VoucherDiscountType.PERCENTAGE
        ? {
            type: 'PERCENTAGE',
            value: Percentage.create(voucher.amount),
          }
        : {
            type: 'AMOUNT',
            value: Money.create(voucher.amount),
          };
    const maxDiscount = voucher.maxDiscount
      ? Money.create(voucher.maxDiscount)
      : undefined;

    if (material) {
      if (material.matGrp2) {
        tag = `${TAG_KEY_MATERIAL_GROUP_2}:${material.matGrp2}`;
        const brand = await this.getBrandByTag(Tag.fromString(tag));
        targetName = brand?.description;
      } else if (material.materialId) {
        itemId = material.item?.id;
        targetName = material.item?.info?.name;
      }
    }
    const target = tag
      ? Tag.fromString(tag)
      : itemId
      ? EntityId.fromString(itemId)
      : undefined;

    return {
      type: voucher.isGeneral ? 'general' : 'item',
      id,
      maxDiscount,
      benefit,
      target,
      targetName,
      minPurchase: Money.create(voucher.minPurchaseAmount || 0),
    } as CartVoucher;
  }

  private async resolveCartDeliveryAddress(
    cart: TypeOrmCartEntity,
    identity: UserIdentity,
  ): Promise<DeliveryAddressReadModel | undefined> {
    if (!cart.deliveryAddress) {
      const defaultAddressId = IdentityUtil.getDefaultAddressId(
        identity,
        cart.type,
      );

      if (defaultAddressId) {
        const addresses = await this.buyerRepository.getBuyerAddresses({
          buyerExternalId: identity.externalId,
          type: cart.type,
        });

        const defaultAddress = addresses.find((address) =>
          address.id.equals(EntityId.fromString(defaultAddressId)),
        );

        return defaultAddress;
      } else {
        const addresses = await this.buyerRepository.getBuyerAddresses({
          buyerExternalId: identity.externalId,
          type: cart.type,
          limit: 2,
        });

        if (addresses.length === 1) {
          return addresses[0];
        }
      }
    } else {
      return {
        id: EntityId.fromString(cart.deliveryAddress.id),
        label: cart.deliveryAddress.label,
        name: cart.deliveryAddress.name,
        address: cart.deliveryAddress.address,
      };
    }
  }
}
