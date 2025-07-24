import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from '../../entities/typeorm.item.entity';
import { TypeOrmPromoCriteriaEntity } from './typeorm.promo-criteria.entity';
import { TypeOrmPromoItemBenefitEntity } from './typeorm.promo-item-benefit.entity';
import { TypeOrmPromoItemRedemptionEntity } from './typeorm.promo-item-redemption.entity';
import { TypeOrmPromoTargetEntity } from './typeorm.promo-target.entity';
import { TypeOrmPromoEntity } from './typeorm.promo.entity';

@Entity({ schema: 'sales', name: 'promo_item' })
export class TypeOrmPromoItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ type: 'uuid', select: false })
  readonly promoId: string;

  @ManyToOne('TypeOrmPromoEntity', 'items')
  @JoinColumn({ name: 'promo_id' })
  readonly promo: Relation<TypeOrmPromoEntity>;

  @Column({ type: 'uuid' })
  readonly itemId: string;

  @ManyToOne('TypeOrmItemEntity', 'promotions')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;

  @OneToOne('TypeOrmPromoItemBenefitEntity', 'promoItem')
  readonly benefit?: Relation<TypeOrmPromoItemBenefitEntity>;

  @OneToMany(
    () => TypeOrmPromoCriteriaEntity,
    (promoItem) => promoItem.promoItem,
  )
  @OneToMany('TypeOrmPromoCriteriaEntity', 'promoItem')
  readonly criteria: Relation<TypeOrmPromoCriteriaEntity[]>;

  @ManyToMany('TypeOrmPromoTargetEntity')
  @JoinTable({ name: 'promo_target_item' })
  readonly targets: Relation<TypeOrmPromoTargetEntity[]>;

  @OneToMany('TypeOrmPromoItemRedemptionEntity', 'promoItem')
  readonly redemptions: Relation<TypeOrmPromoItemRedemptionEntity[]>;
}
