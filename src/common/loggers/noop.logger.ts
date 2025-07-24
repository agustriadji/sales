import { ILogger } from '../interfaces';

export class NoopLogger implements ILogger {
  assign(): void {
    // do nothing
  }
  trace() {
    // do nothing
  }
  debug() {
    // do nothing
  }
  info() {
    // do nothing
  }
  warn() {
    // do nothing
  }
  error() {
    // do nothing
  }
  fatal() {
    // do nothing
  }
}
