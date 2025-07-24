import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmPromoCMSEntity } from './typeorm.promo-cms.entity';

@Entity({ schema: 'sales', name: 'promo_cms_target' })
export class TypeOrmPromoCMSTargetEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoId: string;

  @PrimaryColumn()
  readonly salesOffice: string;

  @PrimaryColumn()
  readonly group: string;

  @ManyToOne(() => TypeOrmPromoCMSEntity, 'targets')
  @JoinColumn({ name: 'promo_id' })
  readonly promo: Relation<TypeOrmPromoCMSEntity>;
}
