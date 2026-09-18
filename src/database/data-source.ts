import 'dotenv/config';

import { DataSource } from 'typeorm';
import { getDatabaseOptions } from '../config/database.config';

export const AppDataSource = new DataSource(getDatabaseOptions());
