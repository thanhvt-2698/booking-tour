import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewSubmissionTransactionStore } from './review-submission-transaction.store';
import type { ReviewSubmissionTransaction } from './interfaces/review-submission-transaction.interface';

@Injectable()
export class ReviewsStore {
  constructor(private readonly dataSource: DataSource) {}

  withinTransaction<T>(
    operation: (transaction: ReviewSubmissionTransaction) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new ReviewSubmissionTransactionStore(manager)),
    );
  }
}
