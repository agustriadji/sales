import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_cust_criteria' })
export class TypeOrmCustCriteriaEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column({ name: 'cust_id' })
  readonly buyerExternalId: number;

  @Column()
  readonly isActiveLakupandai: boolean;

  @Column()
  readonly isActiveLoan: boolean;
}
