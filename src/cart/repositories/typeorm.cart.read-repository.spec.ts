import { TypeOrmCartReadRepository } from '.';
import { DataSource } from 'typeorm';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { IdentityStub } from '@stubs/identity.stub';
import { ParameterStub } from '@stubs/parameter.stub';
import { DivisionEnum } from '@wings-corporation/core';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { IBuyerReadRepository } from '../interfaces';

describe('TypeOrmCartReadRepository', () => {
  let repository: TypeOrmCartReadRepository;
  let parameterService: DeepMocked<ParameterService>;
  let dataSource: DeepMocked<DataSource>;
  let buyerRepository: DeepMocked<IBuyerReadRepository>;

  beforeEach(() => {
    parameterService = createMock<ParameterService>();
    dataSource = createMock<DataSource>();
    buyerRepository = createMock<IBuyerReadRepository>();

    repository = new TypeOrmCartReadRepository(
      dataSource,
      buyerRepository,
      parameterService,
    );
  });

  describe('getCartMinimumPurchase()', () => {
    it('should return customer group minimum order for DRY type', async () => {
      const identity = IdentityStub.generate();
      const type = DivisionEnum.DRY;
      const minPurchase = faker.number.int({ min: 5000, max: 100000 });

      const custGroupParameter = ParameterStub.generate({
        values: [
          {
            value: `${identity.organization}-${type}-${
              identity.division.dry!.group
            }-${minPurchase}`,
          },
          {
            value: `${identity.organization}-${type}-${
              identity.division.frozen!.group
            }-${faker.number.int({ min: 5000, max: 100000 })}`,
          },
        ],
      });

      parameterService.get.mockImplementation((key: string) => {
        if (key === ParameterKeys.MINIMUM_ORDER_CUSTOMER_GROUP) {
          return custGroupParameter.values;
        }
        if (key === ParameterKeys.MINIMUM_ORDER_DEFAULT) {
          return [];
        }
        throw new Error('Unexpected key');
      });

      const result = await repository.getCartMinimumPurchase(identity, type);
      expect(result.value).toBe(minPurchase);
    });

    it('should return customer group minimum order for FROZEN type', async () => {
      const identity = IdentityStub.generate();
      const type = DivisionEnum.FROZEN;
      const minPurchase = faker.number.int({ min: 5000, max: 100000 });

      const custGroupParameter = ParameterStub.generate({
        values: [
          {
            value: `${identity.organization}-${type}-${
              identity.division.dry!.group
            }-${faker.number.int({ min: 5000, max: 100000 })}`,
          },
          {
            value: `${identity.organization}-${type}-${
              identity.division.frozen!.group
            }-${minPurchase}`,
          },
        ],
      });

      parameterService.get.mockImplementation((key: string) => {
        if (key === ParameterKeys.MINIMUM_ORDER_CUSTOMER_GROUP) {
          return custGroupParameter.values;
        }
        if (key === ParameterKeys.MINIMUM_ORDER_DEFAULT) {
          return [];
        }
        throw new Error('Unexpected key');
      });

      const result = await repository.getCartMinimumPurchase(identity, type);
      expect(result.value).toBe(minPurchase);
    });

    it('should return default minimum order when customer group parameter not found', async () => {
      const identity = IdentityStub.generate();
      const type = faker.helpers.enumValue(DivisionEnum);
      const defaultMinPurchase = faker.number.int({ min: 100, max: 5000 });

      const otherCustGroupParameter = ParameterStub.generate({
        values: [
          {
            value: `${
              identity.organization
            }-${type}-${faker.string.alphanumeric()}-${faker.number.int({
              min: 5000,
              max: 100000,
            })}`,
          },
        ],
      });

      const defaultParameter = ParameterStub.generate({
        values: [
          {
            value: `${identity.organization}-${type}-${defaultMinPurchase}`,
          },
        ],
      });

      parameterService.get.mockImplementation((key: string) => {
        if (key === ParameterKeys.MINIMUM_ORDER_CUSTOMER_GROUP) {
          return otherCustGroupParameter.values;
        }
        if (key === ParameterKeys.MINIMUM_ORDER_DEFAULT) {
          return defaultParameter.values;
        }
        throw new Error('Unexpected key');
      });

      const result = await repository.getCartMinimumPurchase(identity, type);
      expect(result.value).toBe(defaultMinPurchase);
    });

    it('should return zero when no parameters are found', async () => {
      const identity = IdentityStub.generate();
      const type = faker.helpers.enumValue(DivisionEnum);

      const otherCustGroupParameter = ParameterStub.generate({
        values: [
          {
            value: `${
              identity.organization
            }-${type}-${faker.string.alphanumeric()}-${faker.number.int({
              min: 5000,
              max: 100000,
            })}`,
          },
        ],
      });

      parameterService.get.mockImplementation((key: string) => {
        if (key === ParameterKeys.MINIMUM_ORDER_CUSTOMER_GROUP) {
          return otherCustGroupParameter.values;
        }
        if (key === ParameterKeys.MINIMUM_ORDER_DEFAULT) {
          return [];
        }
        throw new Error('Unexpected key');
      });

      const result = await repository.getCartMinimumPurchase(identity, type);
      expect(result.value).toBe(0);
    });
  });
});
