export class SeedConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedConfigurationError';
  }
}

export class SeedConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedConflictError';
  }
}
