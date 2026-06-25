import { Global, Module } from "@nestjs/common";

import { MailService } from "./mail.service";

/** Module emails transactionnels (Resend + templates trilingues). Global : injecté partout. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
