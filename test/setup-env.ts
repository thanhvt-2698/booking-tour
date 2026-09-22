import 'reflect-metadata';

process.env.NODE_ENV ??= 'test';
process.env.DB_PORT ??= '5433';
process.env.DB_TEST_NAME ??= 'booking_tour_test';
process.env.REDIS_PORT ??= '6380';
