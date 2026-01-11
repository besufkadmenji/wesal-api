import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessageService } from './contact-message.service';
import { ContactMessageResolver } from './contact-message.resolver';
import { ContactMessage } from './entities/contact-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessage])],
  providers: [ContactMessageResolver, ContactMessageService],
  exports: [ContactMessageService],
})
export class ContactMessageModule {}
