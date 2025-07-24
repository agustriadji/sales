import { PinoLogger } from 'nestjs-pino';

import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';

import {
  HEARTBEAT_QUERY,
  SCHEMA_DISCOVERY_QUERY,
  TypeOrmPinoLogger,
} from './typeorm-pino.logger';

const QUERY_EXECUTED_MESSAGE = 'query executed';
const QUERY_FAILED_MESSAGE = 'query failed';
const SLOW_QUERY_MESSAGE = 'slow query detected';

describe('TypeOrmPinoLogger', () => {
  let pino: DeepMocked<PinoLogger>;
  let logger: TypeOrmPinoLogger;

  beforeEach(() => {
    pino = createMock<PinoLogger>();
    logger = new TypeOrmPinoLogger(pino);
  });

  describe('logQuery()', () => {
    it(`should not log heartbeat query`, () => {
      const query = HEARTBEAT_QUERY;
      const parameters = faker.helpers.multiple(faker.string.uuid);
      logger.logQuery(query, parameters);
      expect(pino.debug).not.toHaveBeenCalled();
    });

    it(`should not log schema discovery query`, () => {
      const query = SCHEMA_DISCOVERY_QUERY;
      const parameters = faker.helpers.multiple(faker.string.uuid);
      logger.logQuery(query, parameters);
      expect(pino.debug).not.toHaveBeenCalled();
    });

    it(`should not log server version query`, () => {
      const query = SCHEMA_DISCOVERY_QUERY;
      const parameters = faker.helpers.multiple(faker.string.uuid);
      logger.logQuery(query, parameters);
      expect(pino.debug).not.toHaveBeenCalled();
    });

    it(`should log any other query`, () => {
      const query = faker.lorem.sentence();
      const parameters = faker.helpers.multiple(faker.string.uuid);
      logger.logQuery(query, parameters);
      expect(pino.debug).toHaveBeenCalledWith(
        { query, parameters },
        QUERY_EXECUTED_MESSAGE,
      );
    });
  });

  describe('logQueryError()', () => {
    it(`should log an error message given that error is of type Error`, () => {
      const msg = faker.lorem.sentence();
      const error = new Error(msg);
      const query = faker.lorem.sentence();
      const parameters = faker.helpers.multiple(faker.string.uuid);
      logger.logQueryError(error, query, parameters);
      expect(pino.error).toHaveBeenCalledWith(
        { query, parameters, error: msg },
        QUERY_FAILED_MESSAGE,
      );
    });

    it(`should log an error message given that error is of type String`, () => {
      const msg = faker.lorem.sentence();
      const query = faker.lorem.sentence();
      const parameters = faker.helpers.multiple(faker.string.uuid);
      logger.logQueryError(msg, query, parameters);
      expect(pino.error).toHaveBeenCalledWith(
        { query, parameters, error: msg },
        QUERY_FAILED_MESSAGE,
      );
    });
  });

  describe('logQuerySlow()', () => {
    it(`should log a warn message`, () => {
      const duration = faker.number.int();
      const query = faker.lorem.sentence();
      const parameters = faker.helpers.multiple(faker.string.uuid);
      logger.logQuerySlow(duration, query, parameters);
      expect(pino.warn).toHaveBeenCalledWith(
        { query, parameters, duration },
        SLOW_QUERY_MESSAGE,
      );
    });
  });

  describe('logSchemaBuild()', () => {
    it(`should log an info message`, () => {
      const msg = faker.lorem.sentence();
      logger.logSchemaBuild(msg);
      expect(pino.info).toHaveBeenCalledWith(msg);
    });
  });

  describe('logSchemaBuild()', () => {
    it(`should log an info message`, () => {
      const msg = faker.lorem.sentence();
      logger.logSchemaBuild(msg);
      expect(pino.info).toHaveBeenCalledWith(msg);
    });
  });

  describe('logMigration()', () => {
    it(`should log an info message`, () => {
      const msg = faker.lorem.sentence();
      logger.logMigration(msg);
      expect(pino.info).toHaveBeenCalledWith(msg);
    });
  });

  describe('log()', () => {
    it(`should log using the appropriate level`, () => {
      const levels = ['log', 'info', 'warn'];
      const msg = faker.lorem.sentence();
      for (const level of levels) {
        logger.log(level as any, msg);
        if (level === 'log') {
          expect(pino.debug).toHaveBeenCalledWith(msg);
        } else expect(pino[level]).toHaveBeenCalledWith(msg);
      }
    });
  });
});
