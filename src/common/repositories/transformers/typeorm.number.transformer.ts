import { ValueTransformer } from 'typeorm';

export class NumberTransformer implements ValueTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}
