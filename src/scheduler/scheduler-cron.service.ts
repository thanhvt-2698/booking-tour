import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  DEFAULT_SCHEDULER_ENABLED_OUTSIDE_TEST,
  SCHEDULER_CRON_EXPRESSION,
  SCHEDULER_CRON_JOB_NAME,
  SCHEDULER_ENABLED_CONFIG_KEY,
  SCHEDULER_FAILURE_LOG_EVENT,
  SCHEDULER_NODE_ENV_CONFIG_KEY,
  TEST_NODE_ENVIRONMENT,
} from './constants/scheduler.constants';
import { SchedulerService } from './scheduler.service';

@Injectable()
export class SchedulerCronService {
  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Cron(SCHEDULER_CRON_EXPRESSION, {
    name: SCHEDULER_CRON_JOB_NAME,
    waitForCompletion: true,
  })
  async runScheduledJobs(): Promise<void> {
    if (!this.isSchedulerEnabled()) {
      return;
    }

    try {
      await this.schedulerService.runDueJobs();
    } catch (error: unknown) {
      Logger.error(
        {
          errorName: error instanceof Error ? error.name : 'UnknownError',
          event: SCHEDULER_FAILURE_LOG_EVENT,
        },
        undefined,
        SchedulerCronService.name,
      );
    }
  }

  private isSchedulerEnabled(): boolean {
    const explicitlyEnabled = this.configService.get<boolean>(
      SCHEDULER_ENABLED_CONFIG_KEY,
    );

    if (explicitlyEnabled !== undefined) {
      return explicitlyEnabled;
    }

    const nodeEnvironment = this.configService.get<string>(
      SCHEDULER_NODE_ENV_CONFIG_KEY,
    );

    return nodeEnvironment === TEST_NODE_ENVIRONMENT
      ? false
      : DEFAULT_SCHEDULER_ENABLED_OUTSIDE_TEST;
  }
}
