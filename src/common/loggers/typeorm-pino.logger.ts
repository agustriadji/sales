import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Logger } from 'typeorm';

import { Injectable } from '@nestjs/common';

export const HEARTBEAT_QUERY = 'SELECT 1';
export const SCHEMA_DISCOVERY_QUERY = 'SELECT * FROM current_schema()';
export const SERVER_VERSION_QUERY = 'SELECT version();';

@Injectable()
export class TypeOrmPinoLogger implements Logger {
  constructor(@InjectPinoLogger('TypeORM') readonly logger: PinoLogger) {}

  logQuery(query: string, parameters?: any[]) {
    if (
      query !== HEARTBEAT_QUERY &&
      query !== SCHEMA_DISCOVERY_QUERY &&
      query !== SERVER_VERSION_QUERY
    ) {
      this.logger.debug({ query, parameters }, `query executed`);
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: any[]) {
    this.logger.error(
      {
        query,
        parameters,
        error: error instanceof Error ? error.message : error,
      },
      `query failed`,
    );
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    this.logger.warn(
      { query, parameters, duration: time },
      `slow query detected`,
    );
  }

  logSchemaBuild(message: string) {
    this.logger.info(message);
  }

  logMigration(message: string) {
    this.logger.info(message);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    let logFn;
    switch (level) {
      case 'info':
        logFn = this.logger.info;
        break;
      case 'warn':
        logFn = this.logger.warn;
        break;
      default:
        logFn = this.logger.debug;
        break;
    }
    logFn(message);
  }
}
