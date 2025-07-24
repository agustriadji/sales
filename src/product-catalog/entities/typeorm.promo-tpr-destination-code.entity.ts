import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmDestCodeEntity } from './typeorm.destination-code.entity';
import { TypeOrmPromoTprEntity } from './typeorm.promo-tpr.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_dest_code' })
export class TypeOrmPromoTprDestCodeEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoId: string;

  @PrimaryColumn()
  readonly destCode: string;

  @Column({ type: 'timestamptz', select: false })
  readonly periodFrom: Date;

  @Column({ type: 'timestamptz', select: false })
  readonly periodTo: Date;

  @ManyToOne('TypeOrmPromoTprEntity', 'destCodes')
  readonly promo: Relation<TypeOrmPromoTprEntity>;

  @ManyToOne(() => TypeOrmDestCodeEntity, (destCode) => destCode.promos)
  @JoinColumn({ name: 'dest_code', referencedColumnName: 'destCode' })
  readonly destCodeInfo: Relation<TypeOrmDestCodeEntity>;
}
