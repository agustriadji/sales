import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmUnitOfWorkModule } from '@wings-corporation/nest-typeorm-uow';

import {
  TypeOrmRewardVoucherCustomerEntity,
  TypeOrmRewardVoucherEntity,
  TypeOrmRewardVoucherMaterialEntity,
  TypeOrmVoucherRedemptionEntity,
} from './entities';
import {
  TypeormVoucherReadRepository,
  TypeormVoucherWriteRepository,
} from './repositories';
import {
  VOUCHER_READ_REPOSITORY,
  VOUCHER_WRITE_REPOSITORY,
} from './voucher.constants';

const Entities = [
  TypeOrmRewardVoucherCustomerEntity,
  TypeOrmRewardVoucherEntity,
  TypeOrmRewardVoucherMaterialEntity,
  TypeOrmVoucherRedemptionEntity,
];

const Repositories: Provider<any>[] = [
  {
    provide: VOUCHER_READ_REPOSITORY,
    useClass: TypeormVoucherReadRepository,
  },
  {
    provide: VOUCHER_WRITE_REPOSITORY,
    useClass: TypeormVoucherWriteRepository,
  },
];

const providers = [...Repositories];

@Module({
  imports: [TypeOrmModule.forFeature(Entities), TypeOrmUnitOfWorkModule],
  providers,
  exports: providers,
})
export class VoucherModule {}
