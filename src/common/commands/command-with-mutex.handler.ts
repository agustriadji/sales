import { ICommandHandler } from '@nestjs/cqrs';
import {
  CorrelatableCommand,
  IMutexService,
  IUnitOfWorkService,
} from '@wings-corporation/core';

import { ILogger } from '../interfaces';
import { NoopLogger } from '../loggers';

export abstract class CommandHandlerWithMutex<
  TCommand extends CorrelatableCommand<any>,
  TResult,
> implements ICommandHandler<TCommand>
{
  protected readonly logger: ILogger;

  constructor(
    private readonly mutexService: IMutexService,
    private readonly uowService: IUnitOfWorkService,
    options?: {
      logger?: ILogger;
    },
  ) {
    this.logger = options?.logger || new NoopLogger();
  }

  abstract handler(command: TCommand): Promise<TResult>;

  abstract getLockKey(command: TCommand): Promise<string> | string;

  async beforeCommit(_command: TCommand): Promise<void> {
    return;
  }

  async afterCommit(_command: TCommand, _result: TResult): Promise<TResult> {
    return _result;
  }

  async execute(command: TCommand): Promise<TResult> {
    // we need to obtain lock before running the handler
    const key = await this.getLockKey(command);

    const result: TResult = await this.mutexService.withLock(key, async () => {
      this.logger.trace('mutex lock obtained', key);

      const result = await this.uowService.start<TResult>(async () => {
        this.logger.trace(`handler() fired`, command);
        const result = this.handler(command);
        this.logger.trace('beforeCommit() fired', command);
        await this.beforeCommit(command);
        return result;
      });
      this.logger.trace('afterCommit() fired', command, result);
      return this.afterCommit(command, result);
    });

    return result;
  }
}
