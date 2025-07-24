import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmPromoLoyaltyEntity } from './typeorm.promo-loyalty.entity';

@Entity({ schema: 'public', name: 'm_mechanic1_custgrp' })
export class TypeOrmPromoLoyaltyTargetEntity {
  @PrimaryColumn({ type: 'int', name: 'mechanic1_id' })
  readonly id: string;

  @PrimaryColumn({ name: 'sls_office' })
  readonly salesOffice: string;

  @PrimaryColumn({ name: 'cust_group' })
  readonly group: string;

  @ManyToOne('TypeOrmPromoLoyaltyEntity', 'targets')
  @JoinColumn({ name: 'mechanic1_id' })
  readonly loyalty: Relation<TypeOrmPromoLoyaltyEntity>;
}
