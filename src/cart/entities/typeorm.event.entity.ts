import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

import { Metadata } from '@wings-corporation/core';

@Entity({ schema: 'sales', name: 'event' })
export class TypeOrmEventEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly name: string;

  @Column()
  readonly version: number;

  @Column({ type: 'json' })
  readonly data: Record<string, any>;

  @Column({ type: 'json' })
  readonly metadata: Metadata;

  @CreateDateColumn({ type: 'timestamptz' })
  readonly timestamp: Date;
}
