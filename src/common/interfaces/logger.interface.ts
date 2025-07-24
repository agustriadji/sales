import pino from 'pino';

export type LoggerMethods = Pick<
  pino.Logger,
  'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ILogger extends LoggerMethods {
  assign(fields: pino.Bindings): void;
}
