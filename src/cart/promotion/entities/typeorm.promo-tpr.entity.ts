import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { Organization } from '@wings-corporation/core';

import { TypeOrmPromoTPRDestCodeEntity } from './typeorm.promo-tpr-destination-code.entity';
import { TypeOrmPromoTPRTagCriteriaEntity } from './typeorm.promo-tpr-tag-criteria.entity';
import { TypeOrmPromoTPRTargetEntity } from './typeorm.promo-tpr-target.entity';

@Entity({ schema: 'sales', name: 'promo_tpr' })
export class TypeOrmPromoTPREntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly externalType: string;

  @Column({ type: 'int' })
  readonly priority: number;

  @Column()
  readonly externalId: string;

  @Column()
  readonly entity: Organization;

  @Column({ select: false })
  readonly useDestCode: boolean;

  @OneToMany(() => TypeOrmPromoTPRTargetEntity, (target) => target.promo)
  readonly targets: Relation<TypeOrmPromoTPRTargetEntity[]>;

  @OneToMany(() => TypeOrmPromoTPRDestCodeEntity, (destCode) => destCode.promo)
  readonly destCodes: Relation<TypeOrmPromoTPRDestCodeEntity[]>;

  @OneToOne(
    () => TypeOrmPromoTPRTagCriteriaEntity,
    (tagCriteria) => tagCriteria.promo,
  )
  readonly tagCriteria?: Relation<TypeOrmPromoTPRTagCriteriaEntity>;
}
