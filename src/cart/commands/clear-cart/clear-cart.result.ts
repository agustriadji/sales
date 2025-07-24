import { DomainEvent } from '@wings-corporation/domain';

export class ClearCartResult {
  readonly events: DomainEvent<any>[];

  constructor(events: DomainEvent<any>[]) {
    this.events = events;
  }

  toJSON() {
    return {
      data: {
        total_item: 0,
      },
    };
  }
}
