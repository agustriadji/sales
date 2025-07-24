import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_mapping_condition' })
export class TypeOrmPromoTPRPriorityEntity {
  @PrimaryColumn({ name: 'cond_type', type: 'varchar' })
  readonly externalType: string;

  @Column({ name: 'step', type: 'varchar' })
  readonly priority: number;
}
