import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_parameter' })
export class TypeOrmParameterEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'parameter_id' })
  readonly key: string;

  @Column()
  readonly value: string;

  @Column({ name: 'seq_no' })
  readonly sequence: number;
}
