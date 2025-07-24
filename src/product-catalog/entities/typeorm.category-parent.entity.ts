import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'public', name: 'm_category_group_new' })
export class TypeOrmCategoryParentEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'category_group_name' })
  readonly name: string;

  // @Column({ name: 'm_category_new_id' })
  // readonly categoryId: number[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  readonly createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  readonly updatedDate: Date;
}
