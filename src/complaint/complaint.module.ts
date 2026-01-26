import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintService } from './complaint.service';
import { ComplaintResolver } from './complaint.resolver';
import { Complaint } from './entities/complaint.entity';
import { User } from '../user/entities/user.entity';
import { Listing } from '../listing/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint, User, Listing])],
  providers: [ComplaintResolver, ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
