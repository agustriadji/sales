import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'm_bmas' })
export class TypeOrmBankMasEntity {
  @PrimaryColumn()
  readonly slsOffice: string;

  @Column({ name: 'is_active_bmas' })
  readonly isActive: boolean;
}
