import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SCHEDULER_ENABLED_CONFIG_KEY } from '../scheduler/constants/scheduler.constants';
import {
  BOOKING_NOTIFICATION_RETRIED_EVENT,
  BOOKING_NOTIFICATION_RETRY_COMMAND_FAILED_EVENT,
} from './constants/notification.constants';
import { NotificationsService } from './notifications.service';

export async function runRetryNotificationsCommand(): Promise<void> {
  process.env[SCHEDULER_ENABLED_CONFIG_KEY] = 'false';

  const { AppModule } = await import('../app.module.js');
  const application = await NestFactory.createApplicationContext(AppModule);

  try {
    const retriedCount = await application
      .get(NotificationsService)
      .retryFailedNotifications(new Date());

    Logger.log(
      { event: BOOKING_NOTIFICATION_RETRIED_EVENT, retriedCount },
      'RetryNotificationsCommand',
    );
  } finally {
    await application.close();
  }
}

if (require.main === module) {
  void runRetryNotificationsCommand().catch((error: unknown) => {
    Logger.error(
      {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        event: BOOKING_NOTIFICATION_RETRY_COMMAND_FAILED_EVENT,
      },
      undefined,
      'RetryNotificationsCommand',
    );
    process.exitCode = 1;
  });
}
