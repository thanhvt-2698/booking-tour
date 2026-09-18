import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from './categories/categories.module';
import { getDatabaseConfig } from './config/database.config';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ToursModule } from './tours/tours.module';
import { UsersModule } from './users/users.module';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_REDIS_PORT = 6379;

const parsePort = (value: string | undefined, fallback: number): number => {
  const port = Number(value ?? fallback);

  return Number.isInteger(port) && port > 0 ? port : fallback;
};

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        password: process.env.REDIS_PASSWORD || undefined,
        port: parsePort(process.env.REDIS_PORT, DEFAULT_REDIS_PORT),
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        limit: 100,
        ttl: DEFAULT_RATE_LIMIT_WINDOW_MS,
      },
    ]),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ToursModule,
    BookingsModule,
    ReviewsModule,
    FilesModule,
    NotificationsModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
