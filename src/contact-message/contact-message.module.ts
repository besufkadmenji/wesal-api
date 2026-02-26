import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionGuardModule } from 'lib/common/admin-permission-guard.module';
import { EmailService } from 'lib/email/email.service';
import { ContactMessageService } from './contact-message.service';
import { ContactMessageResolver } from './contact-message.resolver';
import { ContactMessageController } from './contact-message.controller';
import { ContactMessage } from './entities/contact-message.entity';
import { AdminPermission } from 'src/admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactMessage, AdminPermission]),
    AdminPermissionGuardModule,
  ],
  controllers: [ContactMessageController],
  providers: [ContactMessageResolver, ContactMessageService, EmailService],
  exports: [ContactMessageService],
})
export class ContactMessageModule {}
