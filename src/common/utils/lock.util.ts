import { GlobalAdvisoryLockIdentifier } from '@wings-online/app.constants';

import { UserIdentity } from '../interfaces';

export class LockUtil {
  public static getCartLockKey(identity: UserIdentity): string {
    return [GlobalAdvisoryLockIdentifier, identity.id].join('-');
  }
}
