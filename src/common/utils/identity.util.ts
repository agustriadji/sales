import { Division, Organization } from '@wings-corporation/core';
import { RETAIL_S_GROUP } from '@wings-online/app.constants';

import { DivisionType, IDivisionInfo, UserIdentity } from '../interfaces';

export class IdentityUtil {
  /**
   *
   * @param identity
   * @param division
   * @returns
   */
  public static getDefaultAddressId(
    identity: UserIdentity,
    division: Division,
  ): string | undefined {
    const divisionInfo =
      division === 'DRY' ? identity.division.dry : identity.division.frozen;
    if (!divisionInfo) return undefined;
    return divisionInfo.defaultDeliveryAddressId;
  }

  /**
   *
   * @param externalId
   * @returns
   */
  public static getOrganizationFromExternalId(
    externalId: string,
  ): Organization {
    if (externalId.startsWith('WS')) {
      return 'WS';
    } else if (externalId.startsWith('WGO')) {
      return 'WGO';
    } else {
      return 'SMU';
    }
  }

  public static isRetailS(org: Organization, group: string): boolean {
    return org != 'WS' && group === RETAIL_S_GROUP;
  }

  public static getDivisionType(
    dry?: IDivisionInfo,
    frozen?: IDivisionInfo,
  ): DivisionType {
    return dry && frozen
      ? 'BOTH'
      : dry && !frozen
      ? 'DRY'
      : !dry && frozen
      ? 'FROZEN'
      : 'NONE';
  }
}
