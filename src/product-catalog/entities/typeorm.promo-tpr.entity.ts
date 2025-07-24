import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { Organization } from '@wings-corporation/core';

import { TypeOrmPromoTprDestCodeEntity } from './typeorm.promo-tpr-destination-code.entity';
import { TypeOrmPromoTprTagCriteriaEntity } from './typeorm.promo-tpr-tag-criteria.entity';
import { TypeOrmPromoTprTargetEntity } from './typeorm.promo-tpr-target.entity';

@Entity({ schema: 'sales', name: 'promo_tpr' })
export class TypeOrmPromoTprEntity {
  @PrimaryColumn()
  readonly id: string;

  @Column()
  readonly priority: number;

  @Column()
  readonly externalType: string;

  @Column({ select: false })
  readonly entity: Organization;

  @Column()
  readonly externalId: string;

  @Column()
  readonly useDestCode: boolean;

  @OneToMany(() => TypeOrmPromoTprTargetEntity, (target) => target.promo)
  readonly targets: Relation<TypeOrmPromoTprTargetEntity[]>;

  @OneToMany(() => TypeOrmPromoTprDestCodeEntity, (destCode) => destCode.promo)
  readonly destCodes: Relation<TypeOrmPromoTprDestCodeEntity[]>;

  @OneToOne(
    () => TypeOrmPromoTprTagCriteriaEntity,
    (tagCriteria) => tagCriteria.promo,
  )
  readonly tagCriteria?: Relation<TypeOrmPromoTprTagCriteriaEntity>;
}
