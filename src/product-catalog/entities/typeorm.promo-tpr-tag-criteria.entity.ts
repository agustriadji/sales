import { TypeOrmItemInfoEntity, TypeOrmPromoTprEntity } from '.';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomType, UomTypeEnum } from '@wings-online/app.constants';

@Entity({ schema: 'sales', name: 'promo_tpr_tag_criteria' })
export class TypeOrmPromoTprTagCriteriaEntity {
  @PrimaryColumn({ name: 'promo_id' })
  readonly promoId: string;

  @OneToOne(() => TypeOrmPromoTprEntity, (promo) => promo.tagCriteria)
  @JoinColumn({ name: 'promo_id' })
  readonly promo: Relation<TypeOrmPromoTprEntity>;

  @Column()
  readonly tagMinQty: number;

  @Column()
  readonly tagMinUomType?: UomType;

  @Column('uuid', { array: true })
  readonly includedItemIds: string[];

  @Column()
  readonly includedItemMinQty: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly includedItemMinUomType: UomType;

  @Column({ type: 'varchar' })
  readonly includedTag?: string;

  @Column({ type: 'int' })
  readonly includedTagMinQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly includedTagMinUomType?: UomType;

  @Column({ name: 'min_unique_items' })
  readonly minItemCombination: number;

  @Column()
  readonly isRatioBased: boolean;

  includedItemInfos: TypeOrmItemInfoEntity[];
}
