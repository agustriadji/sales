import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomType, UomTypeEnum } from '@wings-online/app.constants';

import { TypeOrmPromoTPREntity } from './typeorm.promo-tpr.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_tag_criteria' })
export class TypeOrmPromoTPRTagCriteriaEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoId: string;

  @OneToOne(() => TypeOrmPromoTPREntity, (promo) => promo.tagCriteria)
  @JoinColumn({ name: 'promo_id' })
  readonly promo: Relation<TypeOrmPromoTPREntity>;

  @Column({ type: 'int' })
  readonly tagMinQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly tagMinUomType?: UomType;

  @Column({ type: 'uuid', array: true })
  readonly includedItemIds: string[];

  @Column({ type: 'int' })
  readonly includedItemMinQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly includedItemMinUomType?: UomType;

  @Column({ type: 'int', name: 'min_unique_items' })
  readonly minItemCombination: number;

  @Column()
  readonly includedTag?: string;

  @Column({ type: 'int' })
  readonly includedTagMinQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly includedTagMinUomType?: UomType;

  @Column()
  readonly isRatioBased: boolean;
}
