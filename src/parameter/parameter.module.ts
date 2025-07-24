import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TypeOrmParameterEntity } from './entities';
import { ParameterService } from './parameter.service';

@Module({})
export class ParameterModule {
  public static forRoot(): DynamicModule {
    const imports = [TypeOrmModule.forFeature([TypeOrmParameterEntity])];
    const providers = [ParameterService];
    const exports = [ParameterService];

    return {
      global: true,
      module: ParameterModule,
      providers,
      imports,
      exports,
    };
  }
}
