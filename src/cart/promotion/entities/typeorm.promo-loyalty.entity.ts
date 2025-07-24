import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import {
  LegacyLoyaltyBenefitType,
  LegacyLoyaltyStatus,
  LoyaltyBenefitType,
} from '@wings-online/cart/promotion';
import { NumberTransformer } from '@wings-online/common';

import { TypeOrmPromoLoyaltyTargetEntity } from './typeorm.promo-loyalty-target.entity';

@Entity({ schema: 'public', name: 'm_mechanic1' })
export class TypeOrmPromoLoyaltyEntity {
  @PrimaryColumn({ type: 'int', name: 'mechanic1_id' })
  readonly id: string;

  @Column({ type: 'timestamptz', name: 'start_date' })
  readonly periodFrom: Date;

  @Column({ type: 'timestamptz', name: 'end_date' })
  readonly periodTo: Date;

  @Column({
    type: 'int',
    name: 'min_purchase',
    transformer: new NumberTransformer(),
  })
  readonly minPurchaseAmount: number;

  @Column({
    name: 'reward_type',
    type: 'varchar',
    transformer: {
      from(value: LegacyLoyaltyBenefitType): LoyaltyBenefitType {
        return value === 'Coin' ? 'COIN' : 'CREDIT_MEMO';
      },
      to(value: LoyaltyBenefitType): LegacyLoyaltyBenefitType {
        return value === 'COIN' ? 'Coin' : 'CM';
      },
    },
  })
  readonly benefitType: LoyaltyBenefitType;

  @Column({
    type: 'numeric',
    name: 'amount',
    transformer: new NumberTransformer(),
  })
  readonly benefitValue: number;

  @Column({ type: 'varchar' })
  readonly status: LegacyLoyaltyStatus;

  @OneToMany('TypeOrmPromoLoyaltyTargetEntity', 'loyalty')
  @JoinColumn({ name: 'mechanic1_id' })
  readonly targets: Relation<TypeOrmPromoLoyaltyTargetEntity[]>;
}
