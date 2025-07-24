import { faker } from '@faker-js/faker';
import { ParameterValue } from '@wings-online/parameter/interfaces/parameter.interface';
import { Parameter } from '@wings-online/parameter/parameter';

export const ParameterStub = {
  generate(
    props: Partial<{
      key: string;
      values: Partial<ParameterValue>[];
    }>,
  ): Parameter {
    const values: ParameterValue[] = [];

    for (let i = 0; i < (props?.values?.length || 1); i++) {
      values.push(
        Object.assign(
          { value: faker.string.alphanumeric(), sequence: faker.number.int() },
          props?.values?.[i] || {},
        ),
      );
    }

    return new Parameter(props?.key || faker.string.alphanumeric(10), values);
  },
};
