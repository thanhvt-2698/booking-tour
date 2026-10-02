import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SCHEDULER_ENABLED_CONFIG_KEY } from './constants/scheduler.constants';
import { SchedulerService } from './scheduler.service';

export async function runSchedulerCommand(): Promise<void> {
  process.env[SCHEDULER_ENABLED_CONFIG_KEY] = 'false';

  const { AppModule } = await import('../app.module.js');
  const application = await NestFactory.createApplicationContext(AppModule);

  try {
    const summary = await application
      .get(SchedulerService)
      .runDueJobs(new Date());

    Logger.log(summary, 'SchedulerCommand');
  } finally {
    await application.close();
  }
}

if (require.main === module) {
  void runSchedulerCommand().catch((error: unknown) => {
    Logger.error(
      {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        event: 'scheduler_command_failed',
      },
      undefined,
      'SchedulerCommand',
    );
    process.exitCode = 1;
  });
}
