import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_cust_item_hist' })
export class TypeOrmCustItemHistoryEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column({ name: 'cust_id', type: 'varchar' })
  readonly buyerExternalId: string;

  @Column({ name: 'material_id' })
  readonly externalId: string;

  @Column()
  readonly slsType: number;

  @Column({ type: 'varchar' })
  readonly flagRedline: 'Y' | 'N';
}
