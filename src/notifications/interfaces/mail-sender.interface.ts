import type { MailMessage } from './mail-message.interface';

export interface MailSender {
  send(message: MailMessage): Promise<void>;
}
