import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_category_seq' })
export class TypeOrmCategorySequenceEntity {
  @PrimaryColumn({ type: 'int', select: false })
  readonly id: number;

  @Column({ name: 'customer_id', type: 'varchar', select: false })
  readonly customerId: string;

  @Column({ name: 'category_seq', type: 'jsonb' })
  readonly categorySequence: number[];
}
