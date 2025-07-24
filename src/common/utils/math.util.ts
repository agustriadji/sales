import { Scale } from '../interfaces';

export class MathUtil {
  /**
   * Computes the least common multiple (lcm) of two or more `integers`.
   * @param arr
   * @returns
   */
  public static lcm(arr: number[]): number {
    const len = arr.length;
    if (len < 2)
      throw new Error(
        'To calculate lcm at least two number needs to be provided',
      );
    let a;
    let b;

    // convert any negative integers to positive
    for (let i = 0; i < len; i++) {
      a = arr[i];
      arr[i] = Math.abs(a);
    }

    a = arr[0];
    for (let i = 0; i < len; i++) {
      b = arr[i];
      if (a === 0 || b === 0) return 0;
      a = (a * b) / this.gcd(a, b);
    }
    return a;
  }

  /**
   * Computes the greatest common divisor (gcd) of two `integers`
   * @param a
   * @param b
   * @returns
   */
  public static gcd(a: number, b: number): number {
    let k = 1;
    let t;
    if (a === 0) return b;
    if (b === 0) return a;
    while (a % 2 === 0 && b % 2 === 0) {
      a = a / 2;
      b = b / 2;
      k = k * 2;
    }
    while (a % 2 === 0) {
      a = a / 2;
    }
    while (b) {
      while (b % 2 === 0) {
        b = b / 2;
      }
      if (a > b) {
        t = b;
        b = a;
        a = t;
      }
      b = b - a;
    }
    return k * a;
  }

  /**
   * Scales two numbers `a` and `b` based on the provided ratio, ensuring that the scaled values
   * do not exceed the original values.
   *
   * @param a
   * @param b
   * @param scale
   * @returns
   */
  public static maxScale(a: number, b: number, scale: Scale): Scale {
    const factor = Math.min(Math.floor(a / scale.x), Math.floor(b / scale.y));
    return { x: factor * scale.x, y: factor * scale.y };
  }
}
