import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmVideoEntity } from './typeorm.video.entity';

@Entity({ schema: 'public', name: 'm_video_seq' })
export class TypeOrmVideoSequenceEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'video_content_id' })
  readonly videoId: number;

  @OneToOne(() => TypeOrmVideoEntity, 'sequence')
  @JoinColumn({ name: 'video_content_id' })
  readonly video: Relation<TypeOrmVideoEntity>;

  @Column()
  readonly seq: number;
}
