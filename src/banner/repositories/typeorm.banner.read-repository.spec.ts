import { DateTime } from 'luxon';
import { DataSource } from 'typeorm';

import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { BadRequestException } from '@nestjs/common';
import { IdentityStub } from '@stubs/identity.stub';
import { DivisionEnum } from '@wings-corporation/core';
import { TypeOrmBannerReadRepository } from '@wings-online/banner/repositories/typeorm.banner.read-repository';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { DEFAULT_SUGGESTION_BANNER_RESHOW_DAYS } from '../banner.constants';
import { TypeOrmBuyerInfoEntity } from '../entities';

describe('TypeORMBannerReadRepository', () => {
  let dataSource: DeepMocked<DataSource>;
  let parameterService: DeepMocked<ParameterService>;
  let repository: TypeOrmBannerReadRepository;

  beforeEach(() => {
    dataSource = createMock<DataSource>();
    parameterService = createMock<ParameterService>();
    repository = new TypeOrmBannerReadRepository(dataSource, parameterService);
  });

  describe('getSuggestion()', () => {
    it(`should return banner suggestion for frozen when user only registered on dry division`, async () => {
      const identity = IdentityStub.generate();

      dataSource.createQueryBuilder.mockImplementation((entity: any): any => {
        if (entity === TypeOrmBuyerInfoEntity) {
          return {
            cache: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([
              {
                buyerId: 'some-id',
                type: DivisionEnum.DRY,
                closeSuggestionBannerAt: null,
              },
            ]),
          };
        }
      });

      const result = await repository.getSuggestion(identity);

      expect(result.toJSON()).toStrictEqual({
        dry: false,
        frozen: true,
      });
    });

    it(`should return banner suggestion for dry when user only registered on frozen division`, async () => {
      const identity = IdentityStub.generate();

      dataSource.createQueryBuilder.mockImplementation((entity: any): any => {
        if (entity === TypeOrmBuyerInfoEntity) {
          return {
            cache: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([
              {
                buyerId: 'some-id',
                type: DivisionEnum.FROZEN,
                closeSuggestionBannerAt: null,
              },
            ]),
          };
        }
      });

      const result = await repository.getSuggestion(identity);

      expect(result.toJSON()).toStrictEqual({
        dry: true,
        frozen: false,
      });
    });

    it(`should return no suggestion when user registered in both dry and frozen`, async () => {
      const identity = IdentityStub.generate();

      dataSource.createQueryBuilder.mockImplementation((entity: any): any => {
        if (entity === TypeOrmBuyerInfoEntity) {
          return {
            cache: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([
              { buyerId: 'some-id', type: DivisionEnum.DRY },
              { buyerId: 'some-id', type: DivisionEnum.FROZEN },
            ]),
          };
        }
      });

      const result = await repository.getSuggestion(identity);
      expect(result.toJSON()).toStrictEqual({
        dry: false,
        frozen: false,
      });
    });

    it(`should not return suggestion when user has closeSuggestionBannerAt`, async () => {
      const identity = IdentityStub.generate();

      dataSource.createQueryBuilder.mockImplementation((entity: any): any => {
        if (entity === TypeOrmBuyerInfoEntity) {
          return {
            cache: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([
              {
                buyerId: 'some-id',
                type: DivisionEnum.DRY,
                closeSuggestionBannerAt: new Date(),
              },
            ]),
          };
        }
      });
      const result = await repository.getSuggestion(identity);
      expect(result.toJSON()).toStrictEqual({
        dry: false,
        frozen: false,
      });
    });

    it(`should return suggestion when closeSuggestionBannerAt passed 5 days`, async () => {
      const identity = IdentityStub.generate();

      const tenDaysAgo = DateTime.now().minus({ days: 10 }).toJSDate();

      dataSource.createQueryBuilder.mockImplementation((entity: any): any => {
        if (entity === TypeOrmBuyerInfoEntity) {
          return {
            cache: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([
              {
                buyerId: 'some-id',
                type: DivisionEnum.DRY,
                closeSuggestionBannerAt: tenDaysAgo,
              },
            ]),
          };
        }
      });

      jest
        .spyOn(repository as any, 'getSuggestionBannerReshowConfig')
        .mockResolvedValue({
          [DivisionEnum.DRY]: 5,
          [DivisionEnum.FROZEN]: 5,
        });

      const result = await repository.getSuggestion(identity);
      expect(result.toJSON()).toStrictEqual({
        dry: false,
        frozen: true,
      });
    });

    it(`should return suggestion when closeSuggestionBannerAt passed 30 days with default configuration`, async () => {
      const identity = IdentityStub.generate();

      const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toJSDate();

      dataSource.createQueryBuilder.mockImplementation((entity: any): any => {
        if (entity === TypeOrmBuyerInfoEntity) {
          return {
            cache: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([
              {
                buyerId: 'some-id',
                type: DivisionEnum.DRY,
                closeSuggestionBannerAt: thirtyDaysAgo,
              },
            ]),
          };
        }
      });

      jest
        .spyOn(repository as any, 'getSuggestionBannerReshowConfig')
        .mockResolvedValue({
          [DivisionEnum.DRY]: DEFAULT_SUGGESTION_BANNER_RESHOW_DAYS, // Default value
          [DivisionEnum.FROZEN]: DEFAULT_SUGGESTION_BANNER_RESHOW_DAYS, // Default value
        });

      const result = await repository.getSuggestion(identity);
      expect(result.toJSON()).toStrictEqual({
        dry: false,
        frozen: true,
      });
    });

    it(`should throw error when no buyer info found`, async () => {
      const identity = IdentityStub.generate();

      dataSource.createQueryBuilder.mockImplementation((entity: any): any => {
        if (entity === TypeOrmBuyerInfoEntity) {
          return {
            cache: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]), // No buyer info
          };
        }
      });

      const result = repository.getSuggestion(identity);
      await expect(result).rejects.toThrow(BadRequestException);
    });
  });
});
