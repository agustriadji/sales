import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';

import { PromoType } from '../promotion.constants';
import { TypeOrmPromoCMSCriteriaEntity } from './typeorm.promo-cms-criteria.entity';
import { TypeOrmPromoCMSTargetEntity } from './typeorm.promo-cms-target.entity';

@Entity({ schema: 'sales', name: 'promo_cms' })
export class TypeOrmPromoCMSEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly type: PromoType;

  @Column()
  readonly externalId: string;

  @Column({ type: 'timestamptz' })
  readonly periodFrom: Date;

  @Column({ type: 'timestamptz' })
  readonly periodTo: Date;

  @OneToMany(() => TypeOrmPromoCMSCriteriaEntity, 'promo')
  readonly criteria: Relation<TypeOrmPromoCMSCriteriaEntity[]>;

  @OneToMany(() => TypeOrmPromoCMSTargetEntity, 'promo')
  readonly targets: Relation<TypeOrmPromoCMSTargetEntity[]>;

  // helper columns
  @Column({ name: 'entity' })
  readonly organization: string;
}
