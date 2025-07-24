// import { EntityManager } from 'typeorm';

// import { Injectable } from '@nestjs/common';
// import { PointConfig } from '@wings-online/domains';
// import { TypeOrmConfigEntity } from '@wings-online/entities';
// import { IConfigWriteRepository } from '@wings-online/interfaces';
// import { ConfigUtil } from '@wings-online/utils';

// @Injectable()
// export class TypeOrmConfigWriteRepository implements IConfigWriteRepository {
//   constructor(private readonly entityManager: EntityManager) {}

//   async getPointConfig(): Promise<PointConfig | undefined> {
//     const configs = await this.entityManager
//       .createQueryBuilder(TypeOrmConfigEntity, 'config')
//       .getMany();

//     return ConfigUtil.tryGetPointConfig(configs);
//   }
// }
