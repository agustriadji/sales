import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 't_ic_freezer' })
export class TypeOrmFreezerEntity {
  @PrimaryColumn({ name: 'cust_id' })
  readonly externalId: string;

  @PrimaryColumn()
  readonly visitDate: Date;

  @Column()
  readonly temperature: number;
}
