import ms from 'ms';
import { DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Quantity } from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import { PointConfig, PointConversionRate } from '@wings-online/cart/domains';
import {
  TypeOrmGeneralConfigEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmJqkPointEntity,
  TypeOrmJqkPointTargetEntity,
} from '@wings-online/cart/entities';
import { CacheUtil, UserIdentity } from '@wings-online/common';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { IConfigReadRepository, SalesUom } from '../interfaces';

@Injectable()
export class TypeOrmConfigReadRepository implements IConfigReadRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly parameterService: ParameterService,
  ) {}

  async getPointConfig(
    identity: UserIdentity,
  ): Promise<PointConfig | undefined> {
    const config = await this.dataSource
      .createQueryBuilder(TypeOrmJqkPointEntity, 'config')
      .innerJoinAndSelect(
        'config.rates',
        'rates',
        `TO_DATE(rates.periodFrom, 'YYYYMM') <= now() AND (DATE_TRUNC('MONTH', TO_DATE(rates.periodTo, 'YYYYMM')) + INTERVAL '1 MONTH - 1 day')::date >= now()`,
      )
      .innerJoin(
        TypeOrmJqkPointTargetEntity,
        'target',
        'target.customerId = :customerId',
        { customerId: identity.externalId },
      )
      .where(`TO_DATE(config.periodFrom, 'YYYYMM') <= now()`)
      .andWhere(
        `(DATE_TRUNC('MONTH', TO_DATE(config.periodTo, 'YYYYMM')) + INTERVAL '1 MONTH - 1 day')::date >= now()`,
      )
      .getOne();

    if (!config || config?.rates.length != 3) {
      return;
    }

    return PointConfig.create({
      conversionRate: PointConversionRate.fromExpression(
        config.rates
          .sort(
            (a, b) =>
              a.convertedValue / a.baseValue - b.convertedValue / b.baseValue,
          )
          .map((r) => r.convertedValue / r.baseValue)
          .join(':'),
      ),
      increments: config.increments,
    });
  }

  async getGeneralConfig(
    group: string,
    key: string,
  ): Promise<string | undefined> {
    const config = await this.dataSource
      .createQueryBuilder(TypeOrmGeneralConfigEntity, 'config')
      .where(`config.group = :group`, { group })
      .andWhere(`config.key = :key`, { key })
      .cache(
        CacheUtil.getCacheKey(`config:group:${group}:key:${key}:general`),
        ms('1h'),
      )
      .getOne();

    return config?.value || undefined;
  }

  async getSalesUoms(
    identity: UserIdentity,
    productIds: string[],
  ): Promise<SalesUom[]> {
    if (productIds.length === 0) return [];

    const salesUom = await this.dataSource
      .createQueryBuilder(TypeOrmItemSalesUomEntity, 'uom')
      .where('uom.itemId in (:...productIds)', { productIds })
      .andWhere('uom.slsOffice in (:...slsOffice)', {
        slsOffice: KeyUtil.getSalesUomKeys(identity),
      })
      .orderBy('uom.tier', 'DESC')
      .getMany();

    return salesUom.map((sales) => ({
      itemId: sales.itemId,
      uom: sales.uom,
      packQty: Quantity.create(sales.packQty),
      tier: sales.tier,
    }));
  }

  async getCartSimulatePriceSetting(): Promise<boolean> {
    const config = this.parameterService.getOne(ParameterKeys.SIMULATE_PRICE);

    return config?.value === 'on';
  }
}
