import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { BenefitType, NumberTransformer } from '@wings-online/common';

import { TypeOrmItemEntity } from './typeorm.item.entity';
import { TypeOrmPromoTPRTargetEntity } from './typeorm.promo-tpr-target.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_target_benefit' })
export class TypeOrmPromoTPRTargetBenefitEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoTargetId: string;

  @OneToOne(() => TypeOrmPromoTPRTargetEntity, (target) => target.benefit)
  @JoinColumn({ name: 'promo_target_id' })
  readonly target: Relation<TypeOrmPromoTPRTargetEntity>;

  @Column({ nullable: true, type: 'varchar' })
  readonly benefitType?: BenefitType;

  @Column({ type: 'numeric', transformer: new NumberTransformer() })
  readonly benefitValue?: number;

  @Column({ type: 'int', nullable: true })
  readonly discountPercentage?: number;

  @Column({ type: 'int', nullable: true })
  readonly coinPercentage?: number;

  @Column({ type: 'int', nullable: true })
  readonly maxQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum, nullable: true })
  readonly maxUomType?: UomType;

  @Column({ type: 'uuid', nullable: true })
  readonly freeItemId?: string;

  @Column({ type: 'int', nullable: true })
  readonly freeItemQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum, nullable: true })
  readonly freeItemUomType?: UomType;

  @ManyToOne(() => TypeOrmItemEntity, (promo) => promo.freeItems)
  @JoinColumn({ name: 'free_item_id' })
  readonly freeItem: Relation<TypeOrmItemEntity>;
}
