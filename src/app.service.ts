import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'booking-tour',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
