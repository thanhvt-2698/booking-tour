import { InternalServerErrorException } from '@nestjs/common';

export class CategoryPersistenceException extends InternalServerErrorException {
  constructor() {
    super('errors.internal');
  }
}
