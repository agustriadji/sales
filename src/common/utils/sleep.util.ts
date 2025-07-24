import { setTimeout } from 'timers/promises';

export class SleepUtil {
  public static async sleep(sleepTime: number) {
    return setTimeout(sleepTime);
  }
}
