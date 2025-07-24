import { UserIdentity } from '@wings-online/common';

import { VideoReadModel } from '../read-models';

export interface IVideoReadRepository {
  listVideos(identity: UserIdentity): Promise<VideoReadModel[]>;
}
