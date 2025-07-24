import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_dt_loan_bmas' })
export class TypeOrmBmasLoanEntity {
  @PrimaryColumn({ type: 'int' })
  readonly customerId: number;

  @Column()
  readonly dueDate: Date;
}
