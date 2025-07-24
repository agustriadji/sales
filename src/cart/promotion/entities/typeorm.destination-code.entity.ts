import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmPromoTPRDestCodeEntity } from './typeorm.promo-tpr-destination-code.entity';

@Entity({ schema: 'public', name: 'm_dest_code' })
export class TypeOrmDestCodeEntity {
  @PrimaryColumn()
  readonly destCode: string;

  @Column({ name: 'sales_org', type: 'varchar', array: true, select: false })
  readonly salesOrgs: string[];

  @Column({ name: 'dist_chan', type: 'varchar', array: true, select: false })
  readonly distChannels: string[];

  @Column({ name: 'division', type: 'varchar', array: true, select: false })
  readonly divisions: string[];

  @Column({ name: 'sales_ofc', type: 'varchar', array: true, select: false })
  readonly salesOffices: string[];

  @Column({ name: 'sales_grp', type: 'varchar', array: true, select: false })
  readonly salesGroups: string[];

  @Column({ name: 'cust_grp', type: 'varchar', array: true, select: false })
  readonly groups: string[];

  @Column({ name: 'cust_grp2', type: 'varchar', array: true, select: false })
  readonly groups2: string[];

  @Column({ name: 'customer', type: 'varchar', array: true, select: false })
  readonly buyerExternalIds: string[];

  @Column({ name: 'cust_heir', type: 'varchar', array: true, select: false })
  readonly hierarchies: string[];

  @Column({ name: 'cust_exc', type: 'varchar', array: true, select: false })
  readonly excludedBuyerExternalIds: string[];

  @Column({ name: 'exc_cust_grp', type: 'varchar', array: true, select: false })
  readonly excludedGroups: string[];

  @OneToMany(() => TypeOrmPromoTPRDestCodeEntity, (promo) => promo.destCodeInfo)
  readonly promos: Relation<TypeOrmPromoTPRDestCodeEntity[]>;
}
