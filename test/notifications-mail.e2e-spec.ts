import { ConfigService } from '@nestjs/config';
import { AddressInfo } from 'node:net';
import { SMTPServer } from 'smtp-server';
import {
  MAIL_ENABLED_CONFIG_KEY,
  MAIL_HOST_CONFIG_KEY,
  MAIL_CREDENTIAL_CONFIG_KEY,
  MAIL_PORT_CONFIG_KEY,
  MAIL_USER_CONFIG_KEY,
} from '../src/notifications/constants/notification.constants';
import { MailService } from '../src/notifications/mail.service';

describe('MailService SMTP integration', () => {
  let receivedMessages: string[];
  let smtpPort: number;
  let smtpServer: SMTPServer;

  beforeAll(async () => {
    receivedMessages = [];
    smtpServer = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onData: (stream, _, callback) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          receivedMessages.push(Buffer.concat(chunks).toString('utf8'));
          callback();
        });
      },
    });
    await new Promise<void>((resolve) => {
      smtpServer.listen(0, '127.0.0.1', resolve);
    });
    smtpPort = (smtpServer.server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      smtpServer.close((error) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));

          return;
        }

        resolve();
      });
    });
  });

  it('delivers a booking email through SMTP when delivery is enabled', async () => {
    const mailService = new MailService({
      getOrThrow: <T>(key: string): T => {
        const configuration: Record<string, boolean | number | string> = {
          [MAIL_CREDENTIAL_CONFIG_KEY]: '',
          [MAIL_ENABLED_CONFIG_KEY]: true,
          [MAIL_HOST_CONFIG_KEY]: '127.0.0.1',
          [MAIL_PORT_CONFIG_KEY]: smtpPort,
          [MAIL_USER_CONFIG_KEY]: '',
        };

        return configuration[key] as T;
      },
    } as ConfigService);

    await mailService.send({
      from: 'no-reply@example.com',
      subject: 'Booking BT-SMTP-001 has been approved',
      text: 'Your booking has been approved.',
      to: 'traveler@example.com',
    });

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0]).toContain(
      'Subject: Booking BT-SMTP-001 has been approved',
    );
    expect(receivedMessages[0]).toContain('Your booking has been approved.');
  });
});
