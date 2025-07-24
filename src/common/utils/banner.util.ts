import { OrganizationEnum } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class BannerUtil {
  /**
   *
   * @param identity
   * @returns
   */
  public static getBannerShownKeys(identity: UserIdentity): string[] {
    const keys: string[] = ['A', identity.organization];

    Object.values(identity.division).forEach((division) => {
      if (division) {
        if (identity.organization === OrganizationEnum.SMU) {
          if (division.distChannel === '02') keys.push('GT');
          if (division.distChannel === '12') keys.push('H');
        }

        if (
          identity.organization === OrganizationEnum.WS &&
          division.distChannel === '02'
        ) {
          keys.push('WSGT');
        }
      }
    });

    return [...new Set(keys)];
  }
}
