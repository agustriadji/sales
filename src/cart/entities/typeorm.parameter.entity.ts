import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_parameter' })
export class TypeOrmParameterEntity {
  @PrimaryColumn()
  readonly id: number;

  @Column({ name: 'parameter_id', type: 'varchar' })
  readonly key: string;

  @Column()
  readonly value: string;
}
