import { ConfigService } from '@nestjs/config';
import type { MailMessage } from './interfaces/mail-message.interface';
import { MailService } from './mail.service';

describe('MailService', () => {
  it('does not create an SMTP transport when mail delivery is disabled', async () => {
    const getOrThrowMock = jest.fn().mockReturnValue(false);
    const mailService = new MailService({
      getOrThrow: getOrThrowMock,
    } as unknown as ConfigService);
    const message: MailMessage = {
      from: 'no-reply@example.com',
      subject: 'Booking notification',
      text: 'Booking notification body',
      to: 'traveler@example.com',
    };

    await expect(mailService.send(message)).resolves.toBeUndefined();
    expect(getOrThrowMock).toHaveBeenCalledWith('MAIL_ENABLED');
    expect(getOrThrowMock).toHaveBeenCalledTimes(1);
  });
});
