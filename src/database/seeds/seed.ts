import { AppDataSource } from '../data-source';

async function seed() {
  await AppDataSource.initialize();

  try {
    const isReset = process.argv.includes('--reset');
    console.log(`[seed] booking-tour seed started (reset=${isReset})`);
    console.log(
      '[seed] Domain seed data will be added after the first migrations are created.',
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void seed().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exitCode = 1;
});
