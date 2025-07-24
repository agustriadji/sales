import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmJqkPointRateEntity } from './typeorm.jqk-point-rate.entity';
import { TypeOrmJqkPointTargetEntity } from './typeorm.jqk-point-target.entity';

@Entity({ schema: 'public', name: 'm_loyalty_value' })
export class TypeOrmJqkPointEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'card1' })
  readonly baseName: string;

  @Column({ name: 'card_value' })
  readonly increments: number;

  @Column()
  readonly periodFrom: string;

  @Column()
  readonly periodTo: string;

  @OneToMany(() => TypeOrmJqkPointRateEntity, (rates) => rates.point)
  readonly rates: Relation<TypeOrmJqkPointRateEntity[]>;

  readonly target?: Relation<TypeOrmJqkPointTargetEntity>;
}
