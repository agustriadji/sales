import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { XRayClient } from '@wings-corporation/nest-xray';
import { TypeOrmPinoLogger } from '@wings-online/common';

import { TypeOrmModuleOptionsProvider } from './typeorm-module-options.provider';

describe('TypeOrmModuleOptionsProvider', () => {
  let logger: DeepMocked<TypeOrmPinoLogger>;
  let config: DeepMocked<ConfigService>;
  let xray: DeepMocked<XRayClient>;
  let provider: TypeOrmModuleOptionsProvider;

  beforeEach(() => {
    logger = createMock();
    config = createMock();
    xray = createMock();
    provider = new TypeOrmModuleOptionsProvider(config, logger, xray);
  });

  describe('createTypeOrmOptions()', () => {
    it(`should use postgres database type`, async () => {
      const options = await provider.createTypeOrmOptions();
      expect(options.type).toBe('postgres');
    });

    it(`should disable synchronize option`, async () => {
      const options = await provider.createTypeOrmOptions();
      expect(options.synchronize).toBeFalsy();
    });

    it(`should enable auto load entities option`, async () => {
      const options = await provider.createTypeOrmOptions();
      expect(options.autoLoadEntities).toBeTruthy();
    });

    it(`should use master url from PG_DATABASE_WRITE_URL config`, async () => {
      const key = 'PG_DATABASE_WRITE_URL';
      const url = faker.internet.url();
      config.getOrThrow.mockImplementationOnce((path) => {
        if (path === key) return url;
        else return undefined;
      });
      const options = await provider.createTypeOrmOptions();
      expect(
        (options as PostgresConnectionOptions).replication?.master.url,
      ).toEqual(url);
    });

    it(`should use slave url from PG_DATABASE_READ_URL config`, async () => {
      const key = 'PG_DATABASE_READ_URL';
      const url = faker.internet.url();
      config.getOrThrow.mockImplementation((path) => {
        if (path === key) return url;
        else return undefined;
      });
      const options = await provider.createTypeOrmOptions();
      expect(
        (options as PostgresConnectionOptions).replication?.slaves,
      ).toHaveLength(1);
      expect(
        (options as PostgresConnectionOptions).replication?.slaves[0].url,
      ).toEqual(url);
    });

    it(`should use the provided logger`, async () => {
      const options = await provider.createTypeOrmOptions();
      expect(options.logger).toEqual(logger);
    });

    it(`should use snake naming strategy`, async () => {
      const options = await provider.createTypeOrmOptions();
      expect(options.namingStrategy).toBeDefined();
      expect(options.namingStrategy).toBeInstanceOf(SnakeNamingStrategy);
    });

    it(`should instrument driver with tracing`, async () => {
      await provider.createTypeOrmOptions();
      expect(xray.capturePostgres).toHaveBeenCalled();
    });
  });
});
