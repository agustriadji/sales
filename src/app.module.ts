import { ValidationOptions } from 'joi';
import { DataSource } from 'typeorm';

import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { MutexModule } from '@wings-corporation/nest-advisory-lock-mutex';
import { AuthModule } from '@wings-corporation/nest-auth';
import { EventBusModule } from '@wings-corporation/nest-event-bus';
import { FeatureFlagModule } from '@wings-corporation/nest-feature-flag';
import {
  LoggerModule,
  PinoLogger,
  XRayLogger,
} from '@wings-corporation/nest-pino-logger';
import { TypeOrmUnitOfWorkModule } from '@wings-corporation/nest-typeorm-uow';
import { TracingModule, XRAY_CLIENT } from '@wings-corporation/nest-xray';
import { HealthModule, TypeOrmPinoLogger } from '@wings-online/common';

import { EVENTBRIDGE_CLIENT_TOKEN, S3_CLIENT_TOKEN } from './app.constants';
import { AuthService } from './auth';
import { TypeOrmUserDefaultAddressEntity } from './auth/entities/typeorm.user-default-address.entity';
import { TypeOrmUserInfoEntity } from './auth/entities/typeorm.user-info.entity';
import { TypeOrmUserEntity } from './auth/entities/typeorm.user.entity';
import { BannerModule } from './banner/banner.module';
import { CartModule } from './cart/cart.module';
import { TypeOrmFlashsaleEntity } from './common/entities';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { RedisModule } from './common/redis';
import { configSchema } from './config';
import { ParameterModule } from './parameter/parameter.module';
import { ParameterService } from './parameter/parameter.service';
import { ProductCatalogModule } from './product-catalog';
import {
  AuthModuleOptionsProvider,
  EventBridgeClientFactoryProvider,
  EventBusFactoryProvider,
  S3ClientFactoryProvider,
  TypeOrmModuleOptionsProvider,
} from './providers';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    CqrsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      } as ValidationOptions,
    }),
    TracingModule.forRootAsync({
      inject: [PinoLogger],
      useFactory: (pinoLogger: PinoLogger) => {
        const logger = new XRayLogger(pinoLogger.logger);
        return {
          logger,
        };
      },
    }),
    LoggerModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService, TypeOrmPinoLogger, XRAY_CLIENT],
      extraProviders: [TypeOrmPinoLogger],
      useClass: TypeOrmModuleOptionsProvider,
    }),
    TypeOrmModule.forFeature([
      TypeOrmUserEntity,
      TypeOrmUserInfoEntity,
      TypeOrmUserDefaultAddressEntity,
      TypeOrmFlashsaleEntity,
    ]),
    EventBusModule.forRootAsync({
      inject: [ConfigService, EVENTBRIDGE_CLIENT_TOKEN, S3_CLIENT_TOKEN],
      useFactory: EventBusFactoryProvider,
      extraProviders: [
        {
          provide: EVENTBRIDGE_CLIENT_TOKEN,
          inject: [ConfigService],
          useFactory: EventBridgeClientFactoryProvider,
        },
        {
          provide: S3_CLIENT_TOKEN,
          inject: [ConfigService],
          useFactory: S3ClientFactoryProvider,
        },
      ],
    }),
    TypeOrmUnitOfWorkModule,
    MutexModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connectionString: config.getOrThrow('PG_DATABASE_WRITE_URL'),
      }),
    }),
    CqrsModule,
    HealthModule,
    RedisModule,
    AuthModule.forRootAsync({
      inject: [ConfigService],
      useClass: AuthModuleOptionsProvider,
      extraProviders: [AuthService],
    }),
    CartModule,
    WishlistModule,
    ProductCatalogModule,
    BannerModule,
    ParameterModule.forRoot(),
    ScheduleModule.forRoot(),
    FeatureFlagModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        applicationName: configService.getOrThrow(
          'APP_CONFIG_APPLICATION_NAME',
        ),
        environmentName: configService.getOrThrow(
          'APP_CONFIG_ENVIRONMENT_NAME',
        ),
        endpoint: configService.get('APP_CONFIG_ENDPOINT'),
        configProfileName: configService.getOrThrow('APP_CONFIG_PROFILE_NAME'),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService) => {
        const timeoutInMilliseconds: number = configService.getOrThrow<number>(
          'TIMEOUT_IN_MILLISECONDS',
        );
        return new TimeoutInterceptor(timeoutInMilliseconds);
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly parameterService: ParameterService,
  ) {}

  async onApplicationBootstrap() {
    await this.parameterService.loadParameters();

    if (this.dataSource.queryResultCache) {
      await this.dataSource.queryResultCache.synchronize();
    }
  }
}
