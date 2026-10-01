import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  SCHEDULER_ENABLED_CONFIG_KEY,
  SCHEDULER_NODE_ENV_CONFIG_KEY,
} from './constants/scheduler.constants';
import { SchedulerCronService } from './scheduler-cron.service';
import type { SchedulerService } from './scheduler.service';
import type { SchedulerRunSummary } from './interfaces/scheduler-run-summary.interface';

const EMPTY_SCHEDULER_RUN_SUMMARY: SchedulerRunSummary = {
  bookingsExpired: 0,
  bookingsFailedExpiry: 0,
  bookingsScannedForExpiry: 0,
  departuresClosed: 0,
  departuresScannedForClosure: 0,
  departuresCompleted: 0,
  departuresScannedForCompletion: 0,
  notificationsDispatched: 0,
  remindersScanned: 0,
  remindersSubmitted: 0,
};

describe('SchedulerCronService', () => {
  let configValues: Record<string, boolean | string | undefined>;
  let schedulerService: jest.Mocked<Pick<SchedulerService, 'runDueJobs'>>;
  let schedulerCronService: SchedulerCronService;

  beforeEach(() => {
    configValues = {};
    schedulerService = {
      runDueJobs: jest.fn().mockResolvedValue(EMPTY_SCHEDULER_RUN_SUMMARY),
    };
    schedulerCronService = new SchedulerCronService(
      {
        get: jest.fn((key: string) => configValues[key]),
      } as unknown as ConfigService,
      schedulerService as unknown as SchedulerService,
    );
  });

  it('does not run scheduled jobs when explicitly disabled', async () => {
    configValues[SCHEDULER_ENABLED_CONFIG_KEY] = false;
    configValues[SCHEDULER_NODE_ENV_CONFIG_KEY] = 'development';

    await schedulerCronService.runScheduledJobs();

    expect(schedulerService.runDueJobs).not.toHaveBeenCalled();
  });

  it('defaults to disabled in test and enabled outside test', async () => {
    configValues[SCHEDULER_NODE_ENV_CONFIG_KEY] = 'test';

    await schedulerCronService.runScheduledJobs();
    expect(schedulerService.runDueJobs).not.toHaveBeenCalled();

    configValues[SCHEDULER_NODE_ENV_CONFIG_KEY] = 'development';
    await schedulerCronService.runScheduledJobs();

    expect(schedulerService.runDueJobs).toHaveBeenCalledTimes(1);
  });

  it('logs a safe failure and keeps the cron callback resolved', async () => {
    const loggerErrorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    configValues[SCHEDULER_ENABLED_CONFIG_KEY] = true;
    schedulerService.runDueJobs.mockRejectedValue(
      new Error('database connection details'),
    );

    await expect(
      schedulerCronService.runScheduledJobs(),
    ).resolves.toBeUndefined();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ errorName: 'Error' }),
      undefined,
      SchedulerCronService.name,
    );
    expect(JSON.stringify(loggerErrorSpy.mock.calls[0])).not.toContain(
      'database connection details',
    );
    loggerErrorSpy.mockRestore();
  });
});
