import { DataSource } from 'typeorm';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let ctrl: HealthController;
  let health: DeepMocked<HealthCheckService>;
  let typeorm: DeepMocked<TypeOrmHealthIndicator>;
  let datasource: DeepMocked<DataSource>;

  beforeEach(() => {
    health = createMock<HealthCheckService>();
    typeorm = createMock<TypeOrmHealthIndicator>();
    datasource = createMock<DataSource>();
    ctrl = new HealthController(health, typeorm, datasource);
  });

  describe('check()', () => {
    it(`should call health check service`, async () => {
      await expect(ctrl.check()).resolves.not.toThrow();
      expect(health.check).toHaveBeenCalled();
    });
  });
});
