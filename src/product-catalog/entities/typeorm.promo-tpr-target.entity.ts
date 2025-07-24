import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { PromoTPRType, UomType } from '@wings-online/app.constants';

import { TypeOrmItemEntity } from './typeorm.item.entity';
import { TypeOrmPromoTprCriteriaEntity } from './typeorm.promo-tpr-criteria.entity';
import { TypeOrmPromoTprTargetBenefitEntity } from './typeorm.promo-tpr-target-benefit.entity';
import { TypeOrmPromoTprEntity } from './typeorm.promo-tpr.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_target' })
export class TypeOrmPromoTprTargetEntity {
  @PrimaryColumn()
  readonly id: string;

  @Column()
  readonly promoId: string;

  @ManyToOne(() => TypeOrmPromoTprEntity, (promo) => promo.targets)
  readonly promo: Relation<TypeOrmPromoTprEntity>;

  @Column()
  readonly type: PromoTPRType;

  @Column()
  readonly itemId: string;

  readonly item: Relation<TypeOrmItemEntity>;

  @Column()
  readonly tag: string;

  @Column()
  readonly priority: number;

  @Column({ select: false })
  readonly salesOrg: string;

  @Column({ select: false })
  readonly distChannel: string;

  @Column({ select: false })
  readonly salesOffice: string;

  @Column({ select: false })
  readonly salesGroup: string;

  @Column({ select: false })
  readonly group: string;

  @Column({ select: false })
  readonly buyerExternalId: string;

  @Column({ select: false })
  readonly externalId: string;

  @Column({ select: false })
  readonly periodFrom: Date;

  @Column({ select: false })
  readonly periodTo: Date;

  @OneToOne(
    () => TypeOrmPromoTprTargetBenefitEntity,
    (benefit) => benefit.target,
  )
  readonly benefit: Relation<TypeOrmPromoTprTargetBenefitEntity>;

  @Column()
  readonly scaleQty: number;

  @Column()
  readonly scaleUomType: UomType;

  @OneToMany(() => TypeOrmPromoTprCriteriaEntity, (criteria) => criteria.target)
  readonly criterias: Relation<TypeOrmPromoTprCriteriaEntity[]>;
}
