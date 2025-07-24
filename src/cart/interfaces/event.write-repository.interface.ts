import { DomainEvent } from '@wings-corporation/domain';

export interface IEventWriteRepository {
  save(events: DomainEvent<any>[]): Promise<void>;
}
