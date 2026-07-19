import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintService } from './complaint.service';
import { ComplaintResolver } from './complaint.resolver';
import { Complaint } from './entities/complaint.entity';
import { User } from '../user/entities/user.entity';
import { Listing } from '../listing/entities/listing.entity';
import { ComplaintMessage } from './entities/complaint-message.entity';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Contract } from '../contract/entities/contract.entity';
import { FileUploadModule } from '../../lib/file-upload';
import { AdminPermissionGuardModule } from '../../lib/common/admin-permission-guard.module';
import { AdminPermission } from '../admin-permission/entities/admin-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Complaint,
      ComplaintMessage,
      User,
      Listing,
      Conversation,
      Contract,
      AdminPermission,
    ]),
    FileUploadModule,
    AdminPermissionGuardModule,
  ],
  providers: [ComplaintResolver, ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
