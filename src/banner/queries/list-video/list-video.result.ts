import { VideoReadModel } from '@wings-online/banner/read-models';

export class ListVideoResult {
  readonly data: VideoReadModel[];

  constructor(props: VideoReadModel[]) {
    this.data = props;
  }
}
