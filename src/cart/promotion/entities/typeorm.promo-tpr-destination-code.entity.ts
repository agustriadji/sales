import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmDestCodeEntity } from './typeorm.destination-code.entity';
import { TypeOrmPromoTPREntity } from './typeorm.promo-tpr.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_dest_code' })
export class TypeOrmPromoTPRDestCodeEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoId: string;

  @PrimaryColumn()
  readonly destCode: string;

  @Column({ type: 'timestamptz', select: false })
  readonly periodFrom: Date;

  @Column({ type: 'timestamptz', select: false })
  readonly periodTo: Date;

  @ManyToOne('TypeOrmPromoTPREntity', 'destCodes')
  readonly promo: Relation<TypeOrmPromoTPREntity>;

  @ManyToOne(() => TypeOrmDestCodeEntity, (destCode) => destCode.promos)
  @JoinColumn({ name: 'dest_code', referencedColumnName: 'destCode' })
  readonly destCodeInfo: Relation<TypeOrmDestCodeEntity>;
}
