import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { TypeOrmEventEntity } from '@wings-online/cart/entities';

import { IEventWriteRepository } from '../interfaces';

@Injectable()
export class TypeOrmEventWriteRepository implements IEventWriteRepository {
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  async save(events: DomainEvent<any>[]): Promise<void> {
    if (events.length > 0) {
      await this.uowService
        .getEntityManager()
        .insert(TypeOrmEventEntity, events);
    }
  }
}
