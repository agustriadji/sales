import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_loyalty_cust_card' })
export class TypeOrmJqkPointTargetEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column()
  public readonly customerId: string;
}
