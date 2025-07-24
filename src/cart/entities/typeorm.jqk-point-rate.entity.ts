import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmJqkPointEntity } from './typeorm.jqk-point.entity';

@Entity({ schema: 'public', name: 'm_loyalty_card' })
export class TypeOrmJqkPointRateEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'card1' })
  readonly baseName: string;

  @Column({ name: 'card2' })
  readonly name: string;

  @Column({ name: 'nominal1' })
  readonly convertedValue: number;

  @Column({ name: 'nominal2' })
  readonly baseValue: number;

  @Column()
  readonly periodFrom: string;

  @Column()
  readonly periodTo: string;

  @ManyToOne(() => TypeOrmJqkPointEntity, (point) => point.rates)
  @JoinColumn({ name: 'card1', referencedColumnName: 'baseName' })
  readonly point: Relation<TypeOrmJqkPointEntity>;
}
