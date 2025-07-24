import { DateTime } from 'luxon';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  Division,
  DivisionEnum,
  OrganizationEnum,
} from '@wings-corporation/core';
import { EntityId, Quantity } from '@wings-corporation/domain';
import {
  CART_READ_REPOSITORY,
  CONFIG_READ_REPOSITORY,
  EXCLUDE_CHECK_OVERDUE_TERM,
  ExternalDivisionType,
  LEGACY_ORDER_DEFAULT_TIMEZONE,
} from '@wings-online/app.constants';
import {
  IDivisionInfo,
  UserIdentity,
  createBadRequestException,
} from '@wings-online/common';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { TypeOrmBmasLoanEntity } from '../entities';
import {
  BmasOverdueConfig,
  BuyerOverdue,
  FLASH_SALE_PROMOTION_CODE_SMU,
  GICondTypeSMUProps,
  GICondTypeWSProps,
  GetCartParams,
  GetOverdueResponseSMUProps,
  GetOverdueResponseWSProps,
  GetTotalPriceParams,
  GetTotalPriceResponse,
  ICartReadRepository,
  ICartService,
  IConfigReadRepository,
  JsonCartItemWithPriceProps,
  LIFETIME_PROMOTION_CODE,
  OrderDetailSMUProps,
  OrderDetailWSProps,
  OrderItem,
  OverdueBlockEnum,
  OverdueBlockType,
  OverdueItem,
  REGULAR_PROMOTION_CODE_SMU,
  SimulatePriceRequestSMUProps,
  SimulatePriceRequestWSProps,
  SimulatePriceResponseSMUProps,
  SimulatePriceResponseWSProps,
  VTextSMUEnum,
  VTextWSEnum,
} from '../interfaces';
import { IPromoReadRepository, PROMO_READ_REPOSITORY } from '../promotion';
import { CartItemReadModel, CartReadModel } from '../read-models';
import { CartQtyReadModel } from '../read-models/cart-qty.read-model';
import { CartUtils } from '../utils/cart.utils';
import { VOUCHER_READ_REPOSITORY } from '../voucher';
import { IVoucherReadRepository } from '../voucher/interfaces/voucher.read-repository.interface';
import { FreeProductReadModel } from '../voucher/read-models';

@Injectable()
export class CartService implements ICartService {
  wingsSuryaUrl: string;
  sayapMasUtamaUrl: string;
  wingsSuryaOverdueUrl: string;
  sayapMasUtamaOverdueUrl: string;
  timeout: number;
  dateFormat = 'yyyy-LL-dd';
  batamSalesOrg: string | undefined;
  excludeConditionCodes: string[];
  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    @InjectPinoLogger(CartService.name)
    private readonly logger: PinoLogger,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(CART_READ_REPOSITORY)
    private readonly repository: ICartReadRepository,
    @Inject(CONFIG_READ_REPOSITORY)
    private readonly configRepository: IConfigReadRepository,
    @Inject(PROMO_READ_REPOSITORY)
    private readonly promoRepository: IPromoReadRepository,
    @Inject(VOUCHER_READ_REPOSITORY)
    private readonly voucherRepository: IVoucherReadRepository,
    private readonly parameterService: ParameterService,
  ) {
    this.wingsSuryaUrl = this.config.getOrThrow('WINGS_SURYA_API_URL');
    this.sayapMasUtamaUrl = this.config.getOrThrow('SAYAP_MAS_UTAMA_API_URL');
    this.wingsSuryaOverdueUrl = this.config.getOrThrow(
      'WINGS_SURYA_OVERDUE_API_URL',
    );
    this.sayapMasUtamaOverdueUrl = this.config.getOrThrow(
      'SAYAP_MAS_UTAMA_OVERDUE_API_URL',
    );
    this.timeout = this.config.get('EXTERNAL_API_TIMEOUT') || 5000;
  }

  async getCart(params: GetCartParams): Promise<CartReadModel | undefined> {
    const cart = await this.repository.getCartInfo(
      params.identity,
      params.type,
    );
    if (!cart) {
      return undefined;
    }

    // get item promotions
    const itemIds = cart.items.map((cartItem) => cartItem.item.id);
    const tags = cart.tags.map((tag) => tag.tag.toString());

    const [
      upcomingFlashSale,
      flashSale,
      regularPromotions,
      tprPromotions,
      loyalty,
    ] = await Promise.all([
      await this.promoRepository.getItemNearestUpcomingFlashSale(
        params.identity,
        itemIds,
      ),
      this.promoRepository.getItemFlashSale(params.identity, itemIds),
      this.promoRepository.getItemRegularPromotions(
        params.identity,
        itemIds,
        tags,
      ),
      this.promoRepository.getItemTPRPromotions(
        params.identity,
        cart.items.map((x) => ({
          id: x.item.id,
          baseQty: x.item.baseQty,
          packQty: x.item.packQty,
          tags: x.item.tags,
        })),
      ),
      this.promoRepository.getLoyaltyPromo(params.identity),
    ]);

    if (upcomingFlashSale) {
      cart.setUpcomingFlashSale(upcomingFlashSale);
    }

    const itemFlashSaleMap = CartUtils.mapFlashSaleByItemId(
      flashSale,
      cart.items,
    );

    const cartQty = this.getCartQty(cart);

    const lifetimePromoExternalType = this.parameterService.getOne(
      ParameterKeys.LIFETIME_PROMOTION_EXTERNAL_TYPE,
    );

    for (const cartItem of cart.items) {
      cartItem.setCartQty(cartQty);
      const promotions = tprPromotions.filter(
        (promo) =>
          cartItem.item.tags.some((tag) => promo.tag?.toString() === tag) ||
          (promo.itemId !== '*' &&
            promo.itemId.equals(EntityId.fromString(cartItem.item.id))),
      );
      for (const promo of promotions) {
        if (lifetimePromoExternalType?.value === promo.externalType) {
          cartItem.applyLifetimePromotion(promo);
        } else {
          cartItem.applyPromotion(promo);
        }
      }

      const flashSalePromo = itemFlashSaleMap.get(cartItem.item.id);
      if (flashSalePromo) {
        cartItem.applyPromotion(flashSalePromo);
      }

      const regularPromo = regularPromotions.find(
        (promo) =>
          (promo.itemId !== '*' &&
            promo.itemId.equals(EntityId.fromString(cartItem.item.id))) ||
          cartItem.item.tags.some((tag) => promo.tag?.toString() === tag),
      );
      if (regularPromo) {
        cartItem.applyPromotion(regularPromo);
      }
    }

    if (loyalty) {
      cart.applyLoyaltyPromo(loyalty);
    }

    // get point config
    const pointConfig = await this.configRepository.getPointConfig(
      params.identity,
    );
    if (pointConfig) {
      cart.setPointConfig(pointConfig);
    }

    if (params.type === 'FROZEN') {
      // check qualified for freezer
      const qualified = await this.repository.isFreezerQualified(
        params.identity,
      );
      cart.setFreezerQualified(qualified);
    }

    const minimumPurchase = await this.repository.getCartMinimumPurchase(
      params.identity,
      params.type,
    );
    cart.setMinimumPurchaseAmount(minimumPurchase);

    const vouchers = await this.repository.getCartVouchers(
      params.identity,
      params.type,
    );
    for (const voucher of vouchers) {
      cart.addVoucher(voucher);
    }

    return cart;
  }

  private getCartQty(cart: CartReadModel): CartQtyReadModel {
    const cartQty = new CartQtyReadModel();
    cart.items.forEach((item) => {
      cartQty.addQtyByItem({
        itemId: item.item.id,
        qty: item.qty,
        qtyIntermediate: item.qty,
        qtyPack: item.qtyPack,
        addedAt: item.addedAt,
      });
    });
    cart.tags.forEach((tag) => {
      cartQty.addQtyByTag(tag);
    });

    return cartQty;
  }

  /**
   *
   * @param params
   */
  async getSimulatedPrice(
    params: GetTotalPriceParams,
  ): Promise<GetTotalPriceResponse> {
    const methodName = 'getSimulatedPrice';
    this.logger.trace({ methodName, params }, 'begin');

    const { identity, cart, division } = params;

    [this.batamSalesOrg, this.excludeConditionCodes] = await Promise.all([
      this.getBatamSalesOrg(),
      this.getExcludeConditionCodes(),
    ]);

    const requestBody = await this.generateRequestBody({
      identity,
      division,
      cart,
    });
    this.logger.debug({ methodName, requestBody });

    let result: GetTotalPriceResponse;
    switch (identity.organization) {
      case OrganizationEnum.WS: {
        const url = `${this.wingsSuryaUrl}/sfa/api/getsimulatepricesmartopr`;

        try {
          const response =
            await this.httpService.axiosRef.post<SimulatePriceResponseWSProps>(
              url,
              requestBody,
            );

          result = this.generateResultWS(response.data, cart);
        } catch (error) {
          this.logger.error({
            methodName,
            errorContext: 'Wings API Error',
            error: {
              message: error.message,
              data: error.response?.data,
            },
          });
          throw error;
        }
        break;
      }
      case OrganizationEnum.SMU:
      default:
        {
          const url = `${this.sayapMasUtamaUrl}/WS_WEBSAP_SDV2/webresources/salesorder/simulateSO`;

          try {
            const response =
              await this.httpService.axiosRef.post<SimulatePriceResponseSMUProps>(
                url,
                requestBody,
              );

            const divisionInfo: IDivisionInfo | undefined =
              division === DivisionEnum.DRY
                ? identity.division.dry
                : identity.division.frozen;
            if (!divisionInfo) throw new Error('Division not defined');
            result = this.generateResultSMU(response.data, cart, divisionInfo);
          } catch (error) {
            this.logger.error({
              methodName,
              errorContext: 'Wings API Error',
              error: {
                message: error.message,
                data: error.response?.data,
              },
            });
            throw error;
          }
        }
        break;
    }

    this.logger.debug({ methodName, result });
    this.logger.trace({ methodName }, 'end');
    return result;
  }

  async getOverdue(identity: UserIdentity): Promise<BuyerOverdue> {
    const methodName = 'getOverdue';
    this.logger.trace({ methodName }, 'begin');

    let result: BuyerOverdue;

    switch (identity.organization) {
      case OrganizationEnum.WS: {
        const customerId = identity.externalId.substring(2);
        const url = `${this.wingsSuryaOverdueUrl}/sfa/api/wdt_overdue/${customerId}`;

        try {
          const response =
            await this.httpService.axiosRef.get<GetOverdueResponseWSProps>(url);

          result = await this.generateOverdueResult(
            identity,
            response.data.rows,
          );
        } catch (error) {
          this.logger.error({
            methodName,
            errorContext: 'Wings API Error',
            error: {
              message: error.message,
              data: error.response?.data,
            },
          });
          throw error;
        }
        break;
      }
      case OrganizationEnum.SMU:
      default:
        {
          const url = `${this.sayapMasUtamaOverdueUrl}/WS_WEBSAP_FIV2/webresources/cashier/getOverdue?cust_id=${identity.externalId}`;

          try {
            const response =
              await this.httpService.axiosRef.get<GetOverdueResponseSMUProps>(
                url,
              );

            result = await this.generateOverdueResult(identity, response.data);
          } catch (error) {
            this.logger.error({
              methodName,
              errorContext: 'Wings API Error',
              error: {
                message: error.message,
                data: error.response?.data,
              },
            });
            throw error;
          }
        }
        break;
    }

    this.logger.debug({ methodName, result });
    this.logger.trace({ methodName }, 'end');
    return result;
  }

  /**
   *
   * @param identity
   */
  private async generateRequestBody(params: {
    identity: UserIdentity;
    division: Division;
    cart: CartReadModel;
  }): Promise<SimulatePriceRequestWSProps | SimulatePriceRequestSMUProps> {
    const { identity, cart, division } = params;
    const isWS = identity.organization === OrganizationEnum.WS;

    const divisionInfo: IDivisionInfo | undefined =
      division === DivisionEnum.DRY
        ? identity.division.dry
        : identity.division.frozen;
    if (!divisionInfo) throw new Error('Division not defined');

    const divisionNumber: string =
      division === DivisionEnum.DRY
        ? ExternalDivisionType.DRY
        : ExternalDivisionType.FROZEN;

    const currentDate = DateTime.now()
      .setZone(LEGACY_ORDER_DEFAULT_TIMEZONE)
      .toFormat(this.dateFormat);

    const soldTo = identity.externalId.replace(/^(WS|ws)/, '');

    return isWS
      ? {
          salesOffice: divisionInfo.salesOffice,
          orderHeader: {
            DOC_TYPE: '',
            SALES_ORG: '',
            DISTR_CHAN: '',
            DIVISION: divisionNumber,
            SOLDTO: soldTo,
            SHIPTO: '',
            BILLTO: '',
            PAYER: '',
            SALES: '',
            COLLECTOR: '',
            PRICE_DATE: '',
            PURCH_DATE: '',
            PURCH_NO_C: '',
          },
          orderDetail: this.generateOrderWSDetail(cart),
        }
      : {
          salesOffice: divisionInfo.salesOffice,
          OrderHeader: {
            DOC_TYPE: 'ZS01',
            SALES_ORG: divisionInfo.salesOrg,
            DISTR_CHAN: divisionInfo.distChannel,
            DIVISION: divisionNumber,
            SOLDTO: soldTo,
            SHIPTO: identity.externalId,
            BILLTO: identity.externalId,
            PAYER: divisionInfo.payerId || identity.externalId,
            SALES: divisionInfo?.salesCode || '',
            COLLECTOR: '',
            PRICE_DATE: currentDate,
            PURCH_DATE: currentDate,
            PURCH_NO_C: '',
          },
          OrderDetail: this.generateOrderSMUDetail(cart),
        };
  }

  /**
   *
   * @param cart
   */
  private generateOrderWSDetail(cart: CartReadModel): OrderDetailWSProps[] {
    const orderDetails: OrderDetailWSProps[] = [];

    for (const item of cart.items) {
      const orderItems = this.generateOrderDetail(item);
      orderDetails.push(
        ...orderItems.map((x) => ({
          MATERIAL: x.material,
          QTY: x.qty,
          UOM: x.uom,
          FLASHSALES_ID: x.flash_sale_id,
        })),
      );
    }

    return orderDetails;
  }
  /**
   *
   * @param cart
   */
  private generateOrderSMUDetail(cart: CartReadModel): OrderDetailSMUProps[] {
    const orderDetails: OrderDetailSMUProps[] = [];

    for (const item of cart.items) {
      const orderItems = this.generateOrderDetail(item);
      orderDetails.push(
        ...orderItems.map((x) => ({
          MATERIAL: x.material,
          QTY: x.qty,
          UOM: x.uom,
          FLASH_SALES: x.flash_sale_id,
        })),
      );
    }

    return orderDetails;
  }

  private generateOrderDetail(cartItem: CartItemReadModel): OrderItem[] {
    const orderItems: OrderItem[] = [];
    const flashSaleQty = cartItem.flashSaleQty.value;
    if (flashSaleQty > 0) {
      const { baseQty, packQty } = CartUtils.splitQtyPerUom(flashSaleQty, {
        baseQty: cartItem.item.baseQty,
        packQty: cartItem.item.packQty,
      });

      if (baseQty > 0) {
        orderItems.push({
          material: `${cartItem.item.externalId}`,
          qty: baseQty,
          uom: cartItem.item.baseUoM,
          flash_sale_id: cartItem.flashSaleCode || '',
        });
      }
      if (packQty > 0) {
        orderItems.push({
          material: `${cartItem.item.externalId}`,
          qty: packQty,
          uom: cartItem.item.packUoM || '',
          flash_sale_id: cartItem.flashSaleCode || '',
        });
      }
    }

    const regularQty = cartItem.regularQty.value;
    if (regularQty > 0) {
      const { baseQty, packQty } = CartUtils.splitQtyPerUom(regularQty, {
        baseQty: cartItem.item.baseQty,
        packQty: cartItem.item.packQty,
      });

      if (baseQty > 0) {
        orderItems.push({
          material: `${cartItem.item.externalId}`,
          qty: baseQty,
          uom: cartItem.item.baseUoM,
          flash_sale_id: cartItem.flashSaleCode || '',
        });
      }
      if (packQty > 0) {
        orderItems.push({
          material: `${cartItem.item.externalId}`,
          qty: packQty,
          uom: cartItem.item.packUoM || '',
          flash_sale_id: cartItem.flashSaleCode || '',
        });
      }
    }

    return orderItems;
  }

  /**
   *
   * @returns
   */
  private generateResultWS(
    apiResponse: SimulatePriceResponseWSProps,
    cart: CartReadModel,
  ): GetTotalPriceResponse {
    if (!apiResponse.GI_CONDTYPE_DTL || !apiResponse.GI_CONDTYPE_HDR) {
      return {
        items: [],
        total_gross_price: 0,
        total_net_price: 0,
      };
    }

    const totalGrossPriceInfo = apiResponse.GI_CONDTYPE_HDR.filter(
      (gi) => gi.VTEXT === VTextWSEnum.GROSS_PRICE,
    );

    const totalNetPriceInfo = apiResponse.GI_CONDTYPE_HDR.filter(
      (gi) => gi.VTEXT === VTextWSEnum.NET_PRICE,
    );

    const totalGrossPrice =
      totalGrossPriceInfo.length > 0 ? totalGrossPriceInfo[0].KWERT : 0;

    const totalNetPrice =
      totalNetPriceInfo.length > 0 ? totalNetPriceInfo[0].KWERT : 0;

    return {
      total_gross_price: totalGrossPrice,
      total_net_price: totalNetPrice,
      items: this.generateItemWSResult(apiResponse, cart),
    };
  }

  /** */
  private generateItemWSResult(
    apiResponse: SimulatePriceResponseWSProps,
    cart: CartReadModel,
  ): JsonCartItemWithPriceProps[] {
    if (!apiResponse.GI_CONDTYPE_DTL) return [];

    const grossPrices: GICondTypeWSProps[] = apiResponse.GI_CONDTYPE_DTL.filter(
      (gi) => gi.VTEXT === VTextWSEnum.GROSS_PRICE,
    );
    const netPrices: GICondTypeWSProps[] = apiResponse.GI_CONDTYPE_DTL.filter(
      (gi) => gi.VTEXT === VTextWSEnum.NET_PRICE,
    );

    return cart.items.map((item) => {
      const itemGrossPrices = grossPrices.filter(
        (gp) => gp.MATNR === item.item.externalId.toString(),
      );
      const itemNetPrices = netPrices.filter(
        (gp) => gp.MATNR === item.item.externalId.toString(),
      );

      let flashSaleDiscount = 0;
      const flashSaleQty = item.flashSaleQty.value;
      if (flashSaleQty > 0) {
        const { baseQty, packQty } = CartUtils.splitQtyPerUom(flashSaleQty, {
          baseQty: item.item.baseQty,
          packQty: item.item.packQty,
        });
        const flashSaleGrossPrice = itemGrossPrices
          .filter(
            (gp) =>
              (gp.KPEIN === baseQty && gp.KMEIN === item.item.baseUoM) ||
              (gp.KPEIN === packQty && gp.KMEIN === item.item.packUoM),
          )
          .reduce((sum, curr) => {
            return sum + curr.KWERT;
          }, 0);
        const flashSaleNetPrice = itemNetPrices
          .filter(
            (gp) =>
              (gp.KPEIN === baseQty && gp.KMEIN === item.item.baseUoM) ||
              (gp.KPEIN === packQty && gp.KMEIN === item.item.packUoM),
          )
          .reduce((sum, curr) => {
            return sum + curr.KWERT;
          }, 0);

        flashSaleDiscount = flashSaleGrossPrice - flashSaleNetPrice;
      }

      let regularDiscount = 0;
      const regularQty = item.regularQty.value;
      if (regularQty > 0) {
        const { baseQty, packQty } = CartUtils.splitQtyPerUom(regularQty, {
          baseQty: item.item.baseQty,
          packQty: item.item.packQty,
        });
        const regularGrossPrice = itemGrossPrices
          .filter(
            (gp) =>
              (gp.KPEIN === baseQty && gp.KMEIN === item.item.baseUoM) ||
              (gp.KPEIN === packQty && gp.KMEIN === item.item.packUoM),
          )
          .reduce((sum, curr) => {
            return sum + curr.KWERT;
          }, 0);
        const regularNetPrice = itemNetPrices
          .filter(
            (gp) =>
              (gp.KPEIN === baseQty && gp.KMEIN === item.item.baseUoM) ||
              (gp.KPEIN === packQty && gp.KMEIN === item.item.packUoM),
          )
          .reduce((sum, curr) => {
            return sum + curr.KWERT;
          }, 0);

        regularDiscount = regularGrossPrice - regularNetPrice;
      }

      const grossPrice = itemGrossPrices.reduce((sum, curr) => {
        return sum + curr.KWERT;
      }, 0);
      const netPrice = itemNetPrices.reduce((sum, curr) => {
        return sum + curr.KWERT;
      }, 0);

      return {
        id: item.item.id,
        external_id: item.item.externalId,
        gross_price: grossPrice,
        net_price: netPrice,
        flash_sale_discount: flashSaleDiscount,
        regular_discount: regularDiscount,
        lifetime_discount: 0, // WS doesn't have lifetime promotion
        cart_item_id: item.id,
      };
    });
  }

  /**
   *
   * @param apiResponse
   * @param cart
   * @returns
   */
  private generateResultSMU(
    apiResponse: SimulatePriceResponseSMUProps,
    cart: CartReadModel,
    divisionInfo: IDivisionInfo,
  ): GetTotalPriceResponse {
    if (!apiResponse.gi_condtype_dtl || !apiResponse.gi_condtype_hdr) {
      return {
        items: [],
        total_gross_price: 0,
        total_net_price: 0,
      };
    }

    if (apiResponse.iserror && apiResponse.iserror.length > 0) {
      const errorMessage = apiResponse.gi_message.map(
        (message) => message.MESSAGE,
      );
      this.logger.error({ errorMessage });
      throw new Error(`Wings API Error: ${errorMessage.join(',')}`);
    }

    // if sales group from batam, use total amount instead of gross price
    const isBatam =
      this.batamSalesOrg && divisionInfo.salesOrg === this.batamSalesOrg;
    const totalGrossPriceInfo = apiResponse.gi_condtype_hdr.find((gi) => {
      return gi.vtext === VTextSMUEnum.GROSS_PRICE;
    });
    const totalBatamVatInfo = isBatam
      ? apiResponse.gi_condtype_hdr.find((gi) => {
          return gi.vtext === VTextSMUEnum.BATAM_VAT;
        })
      : undefined;
    const totalNetPriceInfo = apiResponse.gi_condtype_hdr.find(
      (gi) => gi.vtext === VTextSMUEnum.TOTAL_AMOUNT,
    );
    const totalFreeProductPriceInfo = apiResponse.gi_condtype_hdr.find((gi) =>
      this.excludeConditionCodes.includes(gi.kschl),
    );

    const totalGrossPrice = totalGrossPriceInfo?.kwert || 0;
    const grossPriceVat = Math.abs(totalBatamVatInfo?.kwert || 0);
    const totalFreeProductPrice = Math.abs(
      totalFreeProductPriceInfo?.kwert || 0,
    );
    const totalNetPrice = totalNetPriceInfo?.kwert || 0;

    return {
      total_gross_price: Math.max(
        totalGrossPrice - grossPriceVat - totalFreeProductPrice,
        0,
      ),
      total_net_price: totalNetPrice,
      items: this.generateItemSMUResult(apiResponse, cart, divisionInfo),
    };
  }

  /**
   *
   * @param apiResponse
   * @param cart
   * @returns
   */
  private generateItemSMUResult(
    apiResponse: SimulatePriceResponseSMUProps,
    cart: CartReadModel,
    divisionInfo: IDivisionInfo,
  ): JsonCartItemWithPriceProps[] {
    if (!apiResponse.gi_condtype_dtl) return [];

    const itemDetails = apiResponse.gi_condtype_dtl.map((x) => ({
      ...x,
      matnr: x.matnr.replace(/^0+/, ''),
    }));

    const isBatam =
      this.batamSalesOrg && divisionInfo.salesOrg === this.batamSalesOrg;
    const grossPrices: GICondTypeSMUProps[] = itemDetails.filter(
      (gi) => gi.vtext === VTextSMUEnum.GROSS_PRICE,
    );
    const batamVats = isBatam
      ? itemDetails.filter((gi) => {
          return gi.vtext === VTextSMUEnum.BATAM_VAT;
        })
      : [];
    const netPrices: GICondTypeSMUProps[] = itemDetails.filter(
      (gi) => gi.vtext === VTextSMUEnum.TOTAL_AMOUNT,
    );

    const lifetimeDiscounts: GICondTypeSMUProps[] = itemDetails.filter(
      (gi) => gi.kschl === LIFETIME_PROMOTION_CODE,
    );
    const flashSaleDiscounts: GICondTypeSMUProps[] = itemDetails.filter((gi) =>
      FLASH_SALE_PROMOTION_CODE_SMU.includes(gi.kschl),
    );
    const regularDiscounts: GICondTypeSMUProps[] = itemDetails.filter((gi) =>
      REGULAR_PROMOTION_CODE_SMU.includes(gi.kschl),
    );

    return cart.items.map((item) => {
      const grossPrice = grossPrices
        .filter((gp) => gp.matnr === item.item.externalId)
        .reduce((sum, curr) => {
          return sum + curr.kwert;
        }, 0);
      const batamVat = batamVats
        .filter((gp) => gp.matnr === item.item.externalId)
        .reduce((sum, curr) => {
          return sum + Math.abs(curr.kwert);
        }, 0);
      const netPrice = netPrices
        .filter((gp) => gp.matnr === item.item.externalId)
        .reduce((sum, curr) => {
          return sum + curr.kwert;
        }, 0);
      const lifetimeDiscount = lifetimeDiscounts
        .filter((gp) => gp.matnr === item.item.externalId)
        .reduce((sum, curr) => {
          return sum + Math.abs(curr.kwert);
        }, 0);
      const flashSaleDiscount = flashSaleDiscounts
        .filter((gp) => gp.matnr === item.item.externalId)
        .reduce((sum, curr) => {
          return sum + Math.abs(curr.kwert);
        }, 0);
      const regularDiscount = regularDiscounts
        .filter((gp) => gp.matnr === item.item.externalId)
        .reduce((sum, curr) => {
          return sum + Math.abs(curr.kwert);
        }, 0);

      return {
        id: item.item.id,
        external_id: item.item.externalId,
        gross_price: Math.max(grossPrice - batamVat, 0),
        net_price: netPrice,
        flash_sale_discount: flashSaleDiscount,
        regular_discount: regularDiscount,
        lifetime_discount: lifetimeDiscount,
        cart_item_id: item.id,
      };
    });
  }

  private async getCustomerBmasLoan(
    externalId: string,
  ): Promise<TypeOrmBmasLoanEntity | null> {
    return await this.dataSource
      .createQueryBuilder(TypeOrmBmasLoanEntity, 'loan')
      .where('loan.customerId = :externalId', { externalId })
      .getOne();
  }

  private async generateOverdueResult(
    identity: UserIdentity,
    items: OverdueItem[],
  ): Promise<BuyerOverdue> {
    const bmasLoan = await this.getCustomerBmasLoan(identity.externalId);
    const { allowedOverdue, reminderOverdue } =
      await this.getBmasOverdueConfig();
    let dryBlock: OverdueBlockType = '';
    let frozenBlock: OverdueBlockType = '';
    const today = new Date();
    for (const item of items) {
      let block: OverdueBlockType = '';
      if (item.MSG === 'OK' && item.NOTES === '') {
        block = OverdueBlockEnum.BLANK;
      } else if (item.MSG === 'Block') {
        block = OverdueBlockEnum.HARD;
      } else if (
        item.MSG === 'OK' &&
        (item.NOTES === 'Warning' || item.NOTES === 'WS_Warning')
      ) {
        block = OverdueBlockEnum.SOFT;
      }

      if (item.SPART === ExternalDivisionType.DRY) {
        dryBlock = block;
      } else if (item.SPART === ExternalDivisionType.FROZEN) {
        frozenBlock = block;
      } else if (item.SPART === '**') {
        dryBlock = frozenBlock = block;
      }
    }

    let bmasBlock: OverdueBlockType = '';
    let bmasOverdue = false;
    if (bmasLoan?.dueDate) {
      const overdueDate = DateTime.fromJSDate(bmasLoan.dueDate)
        .plus({
          days: allowedOverdue,
        })
        .toJSDate();
      const reminderDate = DateTime.fromJSDate(bmasLoan.dueDate)
        .plus({
          days: reminderOverdue,
        })
        .toJSDate();
      if (today > overdueDate) {
        bmasBlock = OverdueBlockEnum.HARD;
        bmasOverdue = true;
      } else if (today >= reminderDate && today <= overdueDate) {
        bmasBlock = OverdueBlockEnum.SOFT;
      }
    }

    if (identity.division.dry?.term === EXCLUDE_CHECK_OVERDUE_TERM) {
      dryBlock = '';
    }
    if (identity.division.frozen?.term === EXCLUDE_CHECK_OVERDUE_TERM) {
      frozenBlock = '';
    }

    return {
      dryBlock,
      frozenBlock,
      bmasBlock,
      bmasOverdue,
    };
  }

  private async getBmasOverdueConfig(): Promise<BmasOverdueConfig> {
    const allowedOverdue = this.parameterService.getOne(
      ParameterKeys.ALLOWED_OVERDUE_LOAN,
    );
    const reminderOverdue = this.parameterService.getOne(
      ParameterKeys.REMINDER_OVERDUE_LOAN,
    );

    return {
      allowedOverdue: allowedOverdue ? parseInt(allowedOverdue.value) : 30,
      reminderOverdue: reminderOverdue ? parseInt(reminderOverdue.value) : 23,
    };
  }

  async getFreeProducts(
    params: GetCartParams & { freeProductOnly?: boolean },
  ): Promise<FreeProductReadModel[]> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ params });

    const { identity, type } = params;

    const [cart, vouchers] = await Promise.all([
      this.repository.getCartInfo(identity, type),
      this.voucherRepository.listFreeProductVouchers(identity, type),
    ]);
    if (!cart) throw createBadRequestException('cart not found');

    const validApplyVoucher = cart.items.some((item) =>
      item.qty.gt(Quantity.zero()),
    );
    if (!validApplyVoucher) return [];

    const itemTprPromotions = await this.promoRepository.getItemTPRPromotions(
      identity,
      cart.items.map((x) => ({
        id: x.item.id,
        baseQty: x.item.baseQty,
        packQty: x.item.packQty,
        tags: x.item.tags,
      })),
    );

    cart.setItemPromotions(itemTprPromotions);
    const freeItems = cart.freeItems;
    freeItems.merge(vouchers);

    return freeItems.getItems().filter((item) => item.qty.gt(Quantity.zero()));
  }

  private async getBatamSalesOrg(): Promise<string | undefined> {
    const entity = this.parameterService.getOne(ParameterKeys.BATAM_SALES_ORG);

    return entity ? entity.value.split('-')[0] : undefined;
  }

  private async getExcludeConditionCodes(): Promise<string[]> {
    const entity = this.parameterService.getOne(
      ParameterKeys.EXCLUDE_CONDITION_SIMULATE_PRICE,
    );

    return entity ? entity.value.split(',') : [];
  }
}
