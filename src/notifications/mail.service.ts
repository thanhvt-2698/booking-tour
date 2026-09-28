import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  MAIL_ENABLED_CONFIG_KEY,
  MAIL_HOST_CONFIG_KEY,
  MAIL_CREDENTIAL_CONFIG_KEY,
  MAIL_PORT_CONFIG_KEY,
  MAIL_USER_CONFIG_KEY,
  SMTP_TLS_PORT,
} from './constants/notification.constants';
import type { MailMessage } from './interfaces/mail-message.interface';
import type { MailSender } from './interfaces/mail-sender.interface';

@Injectable()
export class MailService implements MailSender {
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    if (!this.configService.getOrThrow<boolean>(MAIL_ENABLED_CONFIG_KEY)) {
      return;
    }

    await this.getTransporter().sendMail(message);
  }

  private getTransporter(): Transporter {
    this.transporter ??= nodemailer.createTransport({
      auth: this.createAuthentication(),
      host: this.configService.getOrThrow<string>(MAIL_HOST_CONFIG_KEY),
      port: this.configService.getOrThrow<number>(MAIL_PORT_CONFIG_KEY),
      secure:
        this.configService.getOrThrow<number>(MAIL_PORT_CONFIG_KEY) ===
        SMTP_TLS_PORT,
    });

    return this.transporter;
  }

  private createAuthentication(): { pass: string; user: string } | undefined {
    const password = this.configService.getOrThrow<string>(
      MAIL_CREDENTIAL_CONFIG_KEY,
    );
    const user = this.configService.getOrThrow<string>(MAIL_USER_CONFIG_KEY);

    return password && user ? { pass: password, user } : undefined;
  }
}
