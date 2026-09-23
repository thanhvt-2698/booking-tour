import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DEFAULT_RATE_LIMIT_WINDOW_MS } from './common/constants/app.constants';
import { HttpFoundationModule } from './common/http-foundation.module';
import { getDatabaseConfig } from './config/database.config';
import { validateEnvironment } from './config/environment.validation';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    HttpFoundationModule,
    TypeOrmModule.forRoot(getDatabaseConfig()),
    ThrottlerModule.forRoot([
      { limit: 100, ttl: DEFAULT_RATE_LIMIT_WINDOW_MS },
    ]),
    AuthModule,
    CategoriesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
