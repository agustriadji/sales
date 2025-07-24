import { Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmUnitOfWorkModule } from '@wings-corporation/nest-typeorm-uow';
import { ProductCatalogModule } from '@wings-online/product-catalog';

import { CommandControllers, CommandHandlers } from './commands';
import { TypeOrmWishlistEntity, TypeOrmWishlistItemEntity } from './entities';
import { QueryControllers, QueryHandlers } from './queries';
import {
  TypeOrmWishlistReadRepository,
  TypeormWishlistWriteRepository,
} from './repositories';
import {
  WISHLIST_READ_REPOSITORY,
  WISHLIST_WRITE_REPOSITORY,
} from './wishlist.constants';

const Entities = [TypeOrmWishlistEntity, TypeOrmWishlistItemEntity];

const Repositories: Provider<any>[] = [
  {
    provide: WISHLIST_WRITE_REPOSITORY,
    useClass: TypeormWishlistWriteRepository,
  },
  {
    provide: WISHLIST_READ_REPOSITORY,
    useClass: TypeOrmWishlistReadRepository,
  },
];

const providers = [...Repositories, ...CommandHandlers, ...QueryHandlers];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(Entities),
    TypeOrmUnitOfWorkModule,
    ProductCatalogModule,
  ],
  controllers: [...CommandControllers, ...QueryControllers],
  providers,
  exports: providers,
})
export class WishlistModule {}
