import { Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmUnitOfWorkModule } from '@wings-corporation/nest-typeorm-uow';

import {
  BANNER_READ_REPOSITORY,
  BANNER_WRITE_REPOSITORY,
  SLIDE_READ_REPOSITORY,
  VIDEO_READ_REPOSITORY,
} from './banner.constants';
import { CommandControllers, CommandHandlers } from './commands';
import {
  TypeOrmBankMasEntity,
  TypeOrmBannerEntity,
  TypeOrmBuyerInfoEntity,
  TypeOrmClusteringCustEntity,
  TypeOrmClusteringFirebaseEntity,
  TypeOrmCustCriteriaEntity,
  TypeOrmParameterEntity,
  TypeOrmSlideCriteriaEntity,
  TypeOrmSlideEntity,
  TypeOrmVideoEntity,
  TypeOrmVideoSequenceEntity,
} from './entities';
import { QueryControllers, QueryHandlers } from './queries';
import {
  TypeOrmBannerReadRepository,
  TypeormBannerWriteRepository,
  TypeOrmSlideReadRepository,
  TypeOrmVideoReadRepository,
} from './repositories';

const Entities = [
  TypeOrmBannerEntity,
  TypeOrmVideoEntity,
  TypeOrmVideoSequenceEntity,
  TypeOrmSlideEntity,
  TypeOrmSlideCriteriaEntity,
  TypeOrmCustCriteriaEntity,
  TypeOrmClusteringFirebaseEntity,
  TypeOrmClusteringCustEntity,
  TypeOrmBankMasEntity,
  TypeOrmParameterEntity,
  TypeOrmBuyerInfoEntity,
];

const Repositories: Provider<any>[] = [
  {
    provide: BANNER_READ_REPOSITORY,
    useClass: TypeOrmBannerReadRepository,
  },
  {
    provide: VIDEO_READ_REPOSITORY,
    useClass: TypeOrmVideoReadRepository,
  },
  {
    provide: SLIDE_READ_REPOSITORY,
    useClass: TypeOrmSlideReadRepository,
  },
  {
    provide: BANNER_WRITE_REPOSITORY,
    useClass: TypeormBannerWriteRepository,
  },
];

const providers = [...Repositories, ...QueryHandlers, ...CommandHandlers];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(Entities),
    TypeOrmUnitOfWorkModule,
  ],
  controllers: [...QueryControllers, ...CommandControllers],
  providers,
  exports: providers,
})
export class BannerModule {}
